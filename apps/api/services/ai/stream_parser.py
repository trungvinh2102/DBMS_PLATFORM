"""
stream_parser.py

Incremental parser that converts tagged LLM text into semantic stream events for
the AI Assistant UI.
"""

from typing import Iterable, List, Tuple

StreamEvent = Tuple[str, str]


class TaggedResponseStreamParser:
    """Parses model output tags into stable SSE event names."""

    DEFAULT_MARKERS = ("<thinking>", "<confidence>", "```sql", "### ANALYSIS:")
    CLOSE_MARKERS = {
        "thinking": "</thinking>",
        "confidence": "</confidence>",
        "sql": "```",
    }

    def __init__(self):
        self.buffer = ""
        self.mode = "message"
        self.keep_len = max(len(marker) for marker in self.DEFAULT_MARKERS) - 1

    def feed(self, chunk: str) -> List[StreamEvent]:
        """Consumes a text chunk and returns parsed semantic events."""
        if not chunk:
            return []

        self.buffer += chunk
        events: List[StreamEvent] = []

        while self.buffer:
            before = (self.mode, self.buffer)
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
            if index >= 0 and (found_index == -1 or index < found_index):
                found_marker = marker
                found_index = index
        return found_marker, found_index

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
        elif marker == "### ANALYSIS:":
            self.mode = "analysis"
            if self.buffer.startswith("\n"):
                self.buffer = self.buffer[1:]

    def _event_name_for_mode(self) -> str:
        if self.mode == "sql":
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
        return cleaned

    def _should_wait_for_more(self) -> bool:
        if not self.buffer:
            return True
        if self.mode != "message":
            close_marker = self.CLOSE_MARKERS.get(self.mode)
            return bool(close_marker and len(self.buffer) < len(close_marker))
        return len(self.buffer) <= self.keep_len and not any(self.buffer.startswith(marker) for marker in self.DEFAULT_MARKERS)

    def _clean_events(self, events: Iterable[StreamEvent]) -> List[StreamEvent]:
        cleaned = []
        for event, text in events:
            clean_text = self._strip_mode_artifacts(event, text)
            if clean_text:
                cleaned.append((event, clean_text))
        return cleaned
