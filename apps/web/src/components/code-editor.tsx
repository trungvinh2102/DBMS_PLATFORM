"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  height?: string | number;
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  height = "300px",
}: CodeEditorProps) {
  const { theme, systemTheme } = useTheme();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const currentTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(
        currentTheme === "dark" ? "vs-dark" : "light",
      );
    }
  }, [currentTheme]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.setTheme(currentTheme === "dark" ? "vs-dark" : "light");
  };

  return (
    <div className="border rounded-md overflow-hidden" style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        theme={currentTheme === "dark" ? "vs-dark" : "light"}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          padding: { top: 8 },
          lineNumbers: "off",
          renderLineHighlight: "none",
        }}
      />
    </div>
  );
}
