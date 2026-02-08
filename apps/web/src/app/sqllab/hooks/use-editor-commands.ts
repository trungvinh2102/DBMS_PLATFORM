/**
 * @file use-editor-commands.ts
 * @description Custom hook to register Monaco editor commands and hotkeys.
 */

import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";

interface EditorCommandsProps {
  editor: monacoEditor.editor.IStandaloneCodeEditor;
  monaco: Monaco;
  onRun?: () => void;
  onFormat?: () => void;
  onStop?: () => void;
  onSave?: () => void;
}

export function registerEditorCommands({
  editor,
  monaco,
  onRun,
  onFormat,
  onStop,
  onSave,
}: EditorCommandsProps) {
  // Ctrl+Enter to run
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    onRun?.();
  });

  // Ctrl+S to save
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    onSave?.();
  });

  // Ctrl+F to format
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
    onFormat?.();
  });

  // Ctrl+Shift+X to stop
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX,
    () => {
      onStop?.();
    },
  );

  // Alt+Shift+F for format
  editor.addCommand(
    monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    () => {
      onFormat?.();
    },
  );
}
