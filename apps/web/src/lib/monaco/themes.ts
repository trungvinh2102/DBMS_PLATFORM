/**
 * @file themes.ts
 * @description Custom Monaco editor themes for the DMBS Platform.
 */

import type { Monaco } from "@monaco-editor/react";

export const defineThemes = (monaco: Monaco) => {
  // Light theme
  monaco.editor.defineTheme("querypie-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "0033B3", fontStyle: "bold" },
      { token: "string", foreground: "067D17" },
      { token: "number", foreground: "1750EB" },
      { token: "comment", foreground: "8C8C8C", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.lineHighlightBackground": "#F5F8FF",
      "editorCursor.foreground": "#000000",
      "editor.selectionBackground": "#B3D7FF",
      "editorIndentGuide.background": "#F0F0F0",
      "editorLineNumber.foreground": "#A0A0A0",
      "editorLineNumber.activeForeground": "#000000",
      "editorError.foreground": "#E51400",
      "editorError.border": "#E51400",
      "editorWarning.foreground": "#BF8803",
      "editorWarning.border": "#BF8803",
      "editorInfo.foreground": "#1a85ff",
      "editorInfo.border": "#1a85ff",
      "editorGutter.background": "#FFFFFF",
      "editorOverviewRuler.errorForeground": "#E51400",
      "editorOverviewRuler.warningForeground": "#BF8803",
    },
  });

  // Dark theme
  monaco.editor.defineTheme("querypie-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
      { token: "string", foreground: "CE9178" },
      { token: "number", foreground: "B5CEA8" },
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "identifier", foreground: "DCDCAA" },
      { token: "type", foreground: "4EC9B0" },
      { token: "operator", foreground: "#D4D4D4" },
    ],
    colors: {
      "editor.background": "#050505",
      "editor.foreground": "#CCCCCC",
      "editor.lineHighlightBackground": "#1A1A1A",
      "editorCursor.foreground": "#FFFFFF",
      "editor.selectionBackground": "#264F7880",
      "editorIndentGuide.background": "#252525",
      "editorLineNumber.foreground": "#5A5A5A",
      "editorLineNumber.activeForeground": "#CCCCCC",
      "editor.selectionHighlightBackground": "#ADD6FF26",
      "editorError.foreground": "#F14C4C",
      "editorError.border": "#F14C4C",
      "editorWarning.foreground": "#CCA700",
      "editorWarning.border": "#CCA700",
      "editorInfo.foreground": "#3794FF",
      "editorInfo.border": "#3794FF",
      "editorGutter.background": "#050505",
      "editorOverviewRuler.errorForeground": "#F14C4C",
      "editorOverviewRuler.warningForeground": "#CCA700",
    },
  });
};
