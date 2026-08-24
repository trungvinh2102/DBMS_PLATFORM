/**
 * @file sql-editor-selection-debounce.test.tsx
 * @description SQLEditor-level coverage for the debounced selection channel:
 *   1. A registered Monaco `onDidChangeCursorSelection` event delivers the
 *      selected text through `onSelectionChange` only after the 200ms debounce,
 *      together with ownership metadata (owning SQL content + editor session)
 *      frozen at event time.
 *   2. Pure cursor movement (`onDidChangeCursorPosition`) never touches the
 *      selection channel.
 *   3. Unmounting before the debounce elapses drops the pending callback, so
 *      `onSelectionChange` is never invoked after the editor is gone.
 *   4. Replacing the content (`value` prop) before the debounce elapses
 *      cancels the pending callback: a selection can never be delivered
 *      against content it was not made on.
 */

import { act, render } from "../../test-utils";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state: any = {
    selectionListeners: [] as Array<(e: any) => void>,
    positionListeners: [] as Array<(e: any) => void>,
  };
  state.editorApi = {
    onDidChangeCursorSelection: (cb: (e: any) => void) => {
      state.selectionListeners.push(cb);
      return { dispose: () => {} };
    },
    onDidChangeCursorPosition: (cb: (e: any) => void) => {
      state.positionListeners.push(cb);
      return { dispose: () => {} };
    },
    getModel: () => ({
      getValueInRange: (range: any) => range?.text ?? "",
    }),
  };
  state.monacoApi = {
    editor: { setTheme: () => {}, defineTheme: () => {} },
  };
  state.fireSelection = (text: string) => {
    state.selectionListeners.forEach((cb: (e: any) => void) =>
      cb({ selection: { text } }),
    );
  };
  state.fireCursorPosition = (lineNumber = 3, column = 5) => {
    state.positionListeners.forEach((cb: (e: any) => void) =>
      cb({ position: { lineNumber, column } }),
    );
  };
  return state;
});

// Controlled Monaco stand-in: mounts synchronously and registers listeners
// into the hoisted harness so tests can drive the exact editor events the
// real Monaco emits.
vi.mock("@monaco-editor/react", async () => {
  const React = await import("react");
  const FakeEditor = (props: Record<string, any>) => {
    const mountedRef = React.useRef(false);
    React.useEffect(() => {
      if (!mountedRef.current && props.onMount) {
        mountedRef.current = true;
        props.onMount(h.editorApi, h.monacoApi);
      }
    }, []);
    return React.createElement("div", { "data-testid": "fake-monaco" });
  };
  return { default: FakeEditor };
});

vi.mock("@/lib/monaco/useEditorValidation", () => {
  const validate = () => Promise.resolve({ markers: [] });
  return {
    useEditorValidation: () => ({ errors: [], validate, clearMarkers: () => {} }),
  };
});
vi.mock("@/lib/monaco/useRevealPositionRequest", () => ({
  useRevealPositionRequest: () => {},
}));
vi.mock("@/lib/monaco/ErrorPanel", () => ({ ErrorPanel: () => null }));
vi.mock("@/stores/use-settings-store", () => ({
  useSettingsStore: () => ({
    editorInlineSuggestions: false,
    editorMinimap: false,
    editorTabSize: 4,
    editorFontSize: 13,
    editorFontFamily: "monospace",
    editorWordWrap: "off",
    editorLineNumbers: "on",
    editorLigatures: false,
    editorFormatOnPaste: false,
  }),
}));
vi.mock("@/lib/monaco/themes", () => ({ defineThemes: () => {} }));
vi.mock("@/lib/monaco/sql-autocomplete", () => ({
  registerSqlAutocomplete: () => ({ dispose: () => {} }),
  registerSqlSuggestOnTyping: () => ({ dispose: () => {} }),
}));
vi.mock("@/lib/monaco/mongodb-autocomplete", () => ({
  registerMongoAutocomplete: () => ({ dispose: () => {} }),
}));
vi.mock("@/lib/monaco/redis-autocomplete", () => ({
  registerRedisAutocomplete: () => ({ dispose: () => {} }),
}));
vi.mock("@/app/sqllab/hooks/use-editor-commands", () => ({
  registerEditorCommands: () => {},
}));

import { SQLEditor } from "@/lib/monaco/MonacoEditor";

const MULTI_SQL = "SELECT * FROM ab_user\n\nSELECT * FROM ab_group";

describe("SQLEditor debounced selection reporting", () => {
  beforeEach(() => {
    h.selectionListeners.length = 0;
    h.positionListeners.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delivers the selected text after the 200ms debounce; cursor movement leaves selection untouched", async () => {
    const onSelectionChange = vi.fn();
    const onPositionChange = vi.fn();

    render(
      <SQLEditor
        value={MULTI_SQL}
        onChange={() => {}}
        onSelectionChange={onSelectionChange}
        onPositionChange={onPositionChange}
        selectionSessionId="session-1"
        enableValidation={false}
      />,
    );

    // The mount registered exactly one selection listener against Monaco.
    expect(h.selectionListeners).toHaveLength(1);
    expect(onSelectionChange).not.toHaveBeenCalled();

    // Monaco reports a real selection event.
    act(() => {
      h.fireSelection("SELECT * FROM ab_group");
    });
    // Debounced: nothing delivered synchronously.
    expect(onSelectionChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0]).toBe("SELECT * FROM ab_group");
    // Ownership metadata is frozen at event time: the SQL content the
    // selection was made on and the editor session that owns it.
    expect(onSelectionChange.mock.calls[0][1]).toEqual({
      ownerSql: MULTI_SQL,
      sessionId: "session-1",
    });

    // An independent cursor move must not alter or re-emit the selection.
    act(() => {
      h.fireCursorPosition(12, 34);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0]).toBe("SELECT * FROM ab_group");
    // The cursor channel stayed live and independent.
    expect(onPositionChange).toHaveBeenCalledTimes(1);
    expect(onPositionChange).toHaveBeenCalledWith({
      lineNumber: 12,
      column: 34,
    });
  });

  it("delivers only the latest selection when events repeat inside one debounce window", async () => {
    const onSelectionChange = vi.fn();

    render(
      <SQLEditor
        value={MULTI_SQL}
        onChange={() => {}}
        onSelectionChange={onSelectionChange}
        selectionSessionId="session-1"
        enableValidation={false}
      />,
    );

    act(() => {
      h.fireSelection("SELECT * FROM ab_user");
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      h.fireSelection("SELECT * FROM ab_group");
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0]).toBe("SELECT * FROM ab_group");
  });

  it("cancels the pending selection delivery when the content value changes before the debounce elapses", async () => {
    const onSelectionChange = vi.fn();

    const { rerender } = render(
      <SQLEditor
        value={MULTI_SQL}
        onChange={() => {}}
        onSelectionChange={onSelectionChange}
        selectionSessionId="session-1"
        enableValidation={false}
      />,
    );

    expect(h.selectionListeners).toHaveLength(1);

    act(() => {
      h.fireSelection("SELECT * FROM ab_group");
    });
    expect(onSelectionChange).not.toHaveBeenCalled();

    // Content is replaced (saved query loaded, format, tab SQL update)
    // without unmounting the editor, before the 200ms debounce elapses.
    act(() => {
      rerender(
        <SQLEditor
          value="SELECT 'replaced';"
          onChange={() => {}}
          onSelectionChange={onSelectionChange}
          selectionSessionId="session-1"
          enableValidation={false}
        />,
      );
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // The pending callback must never fire against the replaced content:
    // a stale range resolved over new text would repopulate a dead selection.
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("drops the pending selection callback when unmounted before the debounce elapses", async () => {
    const onSelectionChange = vi.fn();

    const { unmount } = render(
      <SQLEditor
        value={MULTI_SQL}
        onChange={() => {}}
        onSelectionChange={onSelectionChange}
        enableValidation={false}
      />,
    );

    expect(h.selectionListeners).toHaveLength(1);

    act(() => {
      h.fireSelection("SELECT * FROM ab_group");
    });
    expect(onSelectionChange).not.toHaveBeenCalled();

    // Unmount before the 200ms debounce fires (e.g. a SQL Lab tab switch).
    unmount();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
