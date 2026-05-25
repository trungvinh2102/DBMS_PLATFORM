"""
stream_parser.py

Incremental parser that converts tagged LLM text into semantic stream events for
the AI Assistant UI.
"""

import json
import re
from json import JSONDecodeError
from typing import Iterable, List, Tuple

StreamEvent = Tuple[str, str]

THINKING_LABEL_PATTERN = re.compile(r"^\s*(Intent|Schema mapping|Strategy):\s*", re.I)


def strip_thinking_label(text: str) -> str:
    """Removes legacy thinking labels from user-visible assistant activity."""
    return THINKING_LABEL_PATTERN.sub("", str(text), count=1)


class TaggedResponseStreamParser:
    """Parses model output tags into stable SSE event names."""

    DEFAULT_MARKERS = (
        "<thinking>",
        "<confidence>",
        "```sql",
        "SQL:",
        "Sql:",
        "sql:",
        "### ANALYSIS:",
        "Analysis:",
        "ANALYSIS:",
        "analysis:",
        "### SUGGESTIONS:",
    )
    INTERNAL_TOOL_NAMES = {"SchemaContextLoader", "RetrievalTrace"}
    CLOSE_MARKERS = {
        "thinking": "</thinking>",
        "confidence": "</confidence>",
        "sql": "```",
    }

    def __init__(self):
        self.buffer = ""
        self.mode = "message"
        self.keep_len = max(len(marker) for marker in self.DEFAULT_MARKERS) - 1
        self.discard_leading_whitespace = False

    def feed(self, chunk: str) -> List[StreamEvent]:
        """Consumes a text chunk and returns parsed semantic events."""
        if not chunk:
            return []

        self.buffer += chunk
        if self.mode == "message" and self.discard_leading_whitespace:
            self.buffer = self.buffer.lstrip()
            self.discard_leading_whitespace = False

        events: List[StreamEvent] = []

        while self.buffer:
            before = (self.mode, self.buffer)
            if self.mode == "message":
                internal_tool_action = self._handle_internal_tool_event()
                if internal_tool_action == "discard":
                    continue
                if internal_tool_action == "wait":
                    break

            if self.mode != "message":
                parsed = self._drain_mode()
            else:
                parsed = self._drain_message()

            events.extend(parsed)

            if self._should_wait_for_more():
                break

            if not parsed and before == (self.mode, self.buffer):
                break

        return self._clean_events(events)

    def _handle_internal_tool_event(self) -> str:
        stripped = self.buffer.lstrip()
        if stripped and "<tool_call".startswith(stripped):
            return "wait"
        if stripped.startswith("<tool_call"):
            return self._handle_internal_tool_tag(stripped)

        if not stripped.startswith("{"):
            return "none"

        try:
            payload, end_index = json.JSONDecoder().raw_decode(stripped)
        except JSONDecodeError:
            if len(stripped) < 512 or self._looks_like_internal_tool_prefix(stripped):
                return "wait"
            return "none"

        if not self._is_internal_tool_payload(payload):
            return "none"

        self.buffer = stripped[end_index:].lstrip()
        self.discard_leading_whitespace = not self.buffer
        return "discard"

    def _handle_internal_tool_tag(self, stripped: str) -> str:
        close_tag = "</tool_call>"
        close_index = stripped.find(close_tag)
        if close_index < 0:
            if self._looks_like_internal_tool_prefix(stripped) or len(stripped) < 2048:
                return "wait"
            return "none"

        self.buffer = stripped[close_index + len(close_tag):].lstrip()
        self.discard_leading_whitespace = not self.buffer
        return "discard"

    def _looks_like_internal_tool_prefix(self, text: str) -> bool:
        prefix = text[:160]
        return '"name"' in prefix and any(tool_name in prefix for tool_name in self.INTERNAL_TOOL_NAMES)

    def _is_internal_tool_payload(self, payload) -> bool:
        return (
            isinstance(payload, dict)
            and payload.get("name") in self.INTERNAL_TOOL_NAMES
            and isinstance(payload.get("args"), dict)
        )

    def flush(self) -> List[StreamEvent]:
        """Emits any buffered text at stream end."""
        if not self.buffer:
            return []

        event_name = self.mode if self.mode != "message" else "message"
        events = [(event_name, self._strip_mode_artifacts(event_name, self.buffer))]
        self.buffer = ""
        self.mode = "message"
        return self._clean_events(events)

    def _drain_message(self) -> List[StreamEvent]:
        marker, index = self._find_next_marker()
        if marker and index == 0:
            self._enter_mode(marker)
            return []

        if marker and index > 0:
            text = self.buffer[:index]
            self.buffer = self.buffer[index:]
            return [("message", text)]

        if len(self.buffer) <= self.keep_len:
            return []

        safe_text = self.buffer[:-self.keep_len]
        self.buffer = self.buffer[-self.keep_len:]
        return [("message", safe_text)]

    def _drain_mode(self) -> List[StreamEvent]:
        close_marker = self.CLOSE_MARKERS.get(self.mode)
        if self.mode == "analysis":
            suggestions_index = self.buffer.find("### SUGGESTIONS:")
            if suggestions_index >= 0:
                text = self.buffer[:suggestions_index]
                self.buffer = self.buffer[suggestions_index + len("### SUGGESTIONS:"):]
                self.mode = "suggestions"
                return [("analysis", text)]

        if self.mode == "legacy_sql":
            marker, index = self._find_next_legacy_sql_close_marker()
            if marker and index >= 0:
                text = self.buffer[:index]
                self.buffer = self.buffer[index + len(marker):]
                self.mode = "analysis"
                if self.buffer.startswith("\n"):
                    self.buffer = self.buffer[1:]
                return [("sql", text)]

            keep_len = self.keep_len
            if len(self.buffer) <= keep_len:
                return []

            safe_text = self.buffer[:-keep_len]
            self.buffer = self.buffer[-keep_len:]
            return [("sql", safe_text)]

        if not close_marker:
            text = self.buffer
            self.buffer = ""
            return [(self.mode, text)]

        close_index = self.buffer.find(close_marker)
        if close_index >= 0:
            text = self.buffer[:close_index]
            self.buffer = self.buffer[close_index + len(close_marker):]
            event_name = self._event_name_for_mode()
            self.mode = "message"
            return [(event_name, text)]

        keep_len = len(close_marker) - 1
        if len(self.buffer) <= keep_len:
            return []

        safe_text = self.buffer[:-keep_len]
        self.buffer = self.buffer[-keep_len:]
        return [(self._event_name_for_mode(), safe_text)]

    def _find_next_marker(self):
        found_marker = None
        found_index = -1
        for marker in self.DEFAULT_MARKERS:
            index = self.buffer.find(marker)
            while index >= 0 and marker.lower() in {"sql:", "analysis:"} and not self._is_line_marker_position(index):
                index = self.buffer.find(marker, index + len(marker))
            if index >= 0 and (found_index == -1 or index < found_index):
                found_marker = marker
                found_index = index
        return found_marker, found_index

    def _is_line_marker_position(self, index: int) -> bool:
        line_start = self.buffer.rfind("\n", 0, index) + 1
        return not self.buffer[line_start:index].strip()

    def _enter_mode(self, marker: str) -> None:
        self.buffer = self.buffer[len(marker):]
        if marker == "<thinking>":
            self.mode = "thinking"
        elif marker == "<confidence>":
            self.mode = "confidence"
        elif marker == "```sql":
            self.mode = "sql"
            if self.buffer.startswith("\n"):
                self.buffer = self.buffer[1:]
        elif marker.lower() == "sql:":
            self.mode = "legacy_sql"
            self.buffer = self.buffer.lstrip()
        elif marker == "### ANALYSIS:":
            self.mode = "analysis"
            if self.buffer.startswith("\n"):
                self.buffer = self.buffer[1:]
        elif marker.lower() == "analysis:":
            self.mode = "analysis"
            if self.buffer.startswith("\n"):
                self.buffer = self.buffer[1:]
        elif marker == "### SUGGESTIONS:":
            self.mode = "suggestions"
            if self.buffer.startswith("\n"):
                self.buffer = self.buffer[1:]

    def _event_name_for_mode(self) -> str:
        if self.mode in {"sql", "legacy_sql"}:
            return "sql"
        if self.mode == "analysis":
            return "analysis"
        if self.mode == "confidence":
            return "confidence"
        return self.mode

    def _strip_mode_artifacts(self, event_name: str, text: str) -> str:
        cleaned = text
        replacements = {
            "thinking": ("<thinking>", "</thinking>"),
            "confidence": ("<confidence>", "</confidence>"),
            "sql": ("```sql", "```"),
        }.get(event_name, ())
        for marker in replacements:
            cleaned = cleaned.replace(marker, "")
        if event_name == "thinking":
            cleaned = strip_thinking_label(cleaned)
        return cleaned

    def _should_wait_for_more(self) -> bool:
        if not self.buffer:
            return True
        if self.mode != "message":
            close_marker = self.CLOSE_MARKERS.get(self.mode)
            if close_marker:
                return len(self.buffer) < len(close_marker)
            return self.mode == "legacy_sql" and len(self.buffer) <= self.keep_len
        return len(self.buffer) <= self.keep_len and not any(self.buffer.startswith(marker) for marker in self.DEFAULT_MARKERS)

    def _find_next_legacy_sql_close_marker(self):
        markers = ("\n### ANALYSIS:", "\nAnalysis:", "\nANALYSIS:", "\nanalysis:", "\n### SUGGESTIONS:")
        found_marker = None
        found_index = -1
        for marker in markers:
            index = self.buffer.find(marker)
            if index >= 0 and (found_index == -1 or index < found_index):
                found_marker = marker
                found_index = index
        return found_marker, found_index

    def _clean_events(self, events: Iterable[StreamEvent]) -> List[StreamEvent]:
        cleaned = []
        for event, text in events:
            clean_text = self._strip_mode_artifacts(event, text)
            if clean_text:
                cleaned.append((event, clean_text))
        return cleaned
