/**
 * @file editor-commands.test.ts
 * @description Regression tests for SQL editor keyboard command registration.
 */

import { describe, expect, it, vi } from "vitest";

import { registerEditorCommands } from "@/app/sqllab/hooks/use-editor-commands";

const monaco = {
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

describe("registerEditorCommands", () => {
  it("does not hijack Ctrl/Cmd+F from search/find", () => {
    const editor = { addCommand: vi.fn() };

    registerEditorCommands({
      editor: editor as any,
      monaco: monaco as any,
      onRun: vi.fn(),
      onFormat: vi.fn(),
      onStop: vi.fn(),
      onSave: vi.fn(),
    });

    const registeredCommands = editor.addCommand.mock.calls.map(
      ([keybinding]) => keybinding,
    );

    expect(registeredCommands).not.toContain(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
    );
    expect(registeredCommands).toContain(
      monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    );
  });
});
