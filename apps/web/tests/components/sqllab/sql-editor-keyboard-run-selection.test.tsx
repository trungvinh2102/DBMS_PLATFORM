/**
 * @file sql-editor-keyboard-run-selection.test.tsx
 * @description SQLEditor-level coverage for the Ctrl/Cmd+Enter keyboard run
 *   boundary: the Monaco command handler resolves the current selection and
 *   forwards it to `onRun` only when it contains non-whitespace text.
 *     1. No selection / cursor-only (`getSelection()` resolving to an empty
 *        range, or returning `null`) → `onRun` receives `undefined`, so
 *        consumers keep their "run full editor content" fallback.
 *     2. Whitespace-only selection → `onRun` receives `undefined` too; an
 *        empty string must never masquerade as an explicit SQL override.
 *   3. Nonempty selection → `onRun` receives the exact selected text plus a
 *        structured ownership intent (`text`, `ownerSql`, `sessionId`)
 *        frozen from the live Monaco model at keypress time, so consumers
 *        can validate the override against the current tab/session/SQL
 *        context before executing it.
 */

import { render } from "../../test-utils";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state: any = {
    selectionListeners: [] as Array<(e: any) => void>,
    positionListeners: [] as Array<(e: any) => void>,
    commands: [] as Array<{ keybinding: number; handler: () => void }>,
    /** Current Monaco selection: a `{ text }` range or `null`. */
    activeSelection: null as { text: string } | null,
    /**
     * Content of the live Monaco model. The keyboard run boundary freezes
     * its ownership metadata from this — not from the React `value` prop —
     * because only the model describes the text the selection was carved
     * from at keypress time.
     */
    modelContent: "",
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
    addCommand: (keybinding: number, handler: () => void) => {
      state.commands.push({ keybinding, handler });
    },
    getSelection: () => state.activeSelection,
    getModel: () => ({
      getValueInRange: (range: any) => range?.text ?? "",
      getValue: () => state.modelContent,
    }),
  };
  state.monacoApi = {
    editor: { setTheme: () => {}, defineTheme: () => {} },
    KeyMod: {
      CtrlCmd: 1 << 11,
      Shift: 1 << 10,
      Alt: 1 << 9,
    },
    KeyCode: {
      Enter: 10,
      KeyS: 11,
      KeyF: 12,
      KeyX: 13,
    },
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

import { SQLEditor } from "@/lib/monaco/MonacoEditor";

const CTRL_ENTER =
  h.monacoApi.KeyMod.CtrlCmd | h.monacoApi.KeyCode.Enter;

function getCtrlEnterHandler(): () => void {
  const command = h.commands.find(
    (cmd: { keybinding: number }) => cmd.keybinding === CTRL_ENTER,
  );
  expect(command, "Ctrl/Cmd+Enter command must be registered").toBeTruthy();
  return command!.handler;
}

describe("SQLEditor keyboard run selection boundary", () => {
  beforeEach(() => {
    h.selectionListeners.length = 0;
    h.positionListeners.length = 0;
    h.commands.length = 0;
    h.activeSelection = null;
    h.modelContent = "";
  });

  it("passes undefined when there is no selection (cursor-only)", () => {
    const onRun = vi.fn();

    render(
      <SQLEditor value="SELECT 1;" onChange={() => {}} onRun={onRun} />,
    );

    // Cursor-only press: a collapsed selection whose resolved text is empty.
    h.activeSelection = { text: "" };
    getCtrlEnterHandler()();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0][0]).toBeUndefined();
    // No selection intent may accompany the empty fallback.
    expect(onRun.mock.calls[0][1]).toBeUndefined();
  });

  it("passes undefined when getSelection returns null", () => {
    const onRun = vi.fn();

    render(
      <SQLEditor value="SELECT 1;" onChange={() => {}} onRun={onRun} />,
    );

    h.activeSelection = null;
    getCtrlEnterHandler()();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0][0]).toBeUndefined();
    expect(onRun.mock.calls[0][1]).toBeUndefined();
  });

  it("passes undefined for a whitespace-only selection", () => {
    const onRun = vi.fn();

    render(
      <SQLEditor value="SELECT 1;" onChange={() => {}} onRun={onRun} />,
    );

    h.activeSelection = { text: "  \n\t  " };
    getCtrlEnterHandler()();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0][0]).toBeUndefined();
    expect(onRun.mock.calls[0][1]).toBeUndefined();
  });

  it("passes the exact selected text for a nonempty selection", () => {
    const onRun = vi.fn();
    const modelContent = "SELECT * FROM ab_user;\nSELECT * FROM ab_group;";

    render(
      <SQLEditor
        value={modelContent}
        onChange={() => {}}
        onRun={onRun}
      />,
    );
    h.modelContent = modelContent;

    h.activeSelection = { text: "SELECT * FROM ab_group" };
    getCtrlEnterHandler()();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0][0]).toBe("SELECT * FROM ab_group");
    // Structured ownership intent frozen at keypress time from the live
    // model, so the consumer can validate it against the current context.
    expect(onRun.mock.calls[0][1]).toEqual({
      text: "SELECT * FROM ab_group",
      ownerSql: modelContent,
      sessionId: "",
    });
  });

  it("freezes ownerSql from the live model even when it diverges from the value prop", () => {
    const onRun = vi.fn();

    render(
      <SQLEditor value="NEW CONTENT;" onChange={() => {}} onRun={onRun} />,
    );
    // The React value has advanced but the Monaco model still holds the old
    // text (the pre-model-update window). The intent must describe what the
    // visible selection was actually carved from.
    h.modelContent = "OLD CONTENT;";

    h.activeSelection = { text: "OLD" };
    getCtrlEnterHandler()();

    expect(onRun.mock.calls[0][0]).toBe("OLD");
    expect(onRun.mock.calls[0][1]).toEqual({
      text: "OLD",
      ownerSql: "OLD CONTENT;",
      sessionId: "",
    });
  });

  it("keeps surrounding whitespace of a meaningful selection intact", () => {
    const onRun = vi.fn();

    render(
      <SQLEditor value="SELECT 1;" onChange={() => {}} onRun={onRun} />,
    );
    h.modelContent = "SELECT 1;";

    h.activeSelection = { text: " SELECT 1 " };
    getCtrlEnterHandler()();

    expect(onRun.mock.calls[0][0]).toBe(" SELECT 1 ");
    expect(onRun.mock.calls[0][1].text).toBe(" SELECT 1 ");
    expect(onRun.mock.calls[0][1].ownerSql).toBe("SELECT 1;");
  });
});
