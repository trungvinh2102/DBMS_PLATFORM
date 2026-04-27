/**
 * @file ScriptTabView.tsx
 * @description Component for displaying the SQL DDL script of a table using the Monaco editor.
 */

import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { defineThemes } from "@/lib/monaco/themes";

export function ScriptTabView({ tableDDL, monacoTheme }: any) {
  const monacoRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-muted/5 flex justify-between items-center shrink-0">
        <h4 className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
          DDL Script
        </h4>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {tableDDL ? (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>}>
            <Editor
              height="100%"
              language="sql"
              theme={monacoTheme === "quriodb-dark" ? "vs-dark" : "vs"}
              value={tableDDL}
              beforeMount={(monaco) => {
                defineThemes(monaco);
              }}
              onMount={(editor, monaco) => {
                monacoRef.current = monaco;
                monaco.editor.setTheme(monacoTheme);
              }}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineNumbers: "on",
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <pre className="text-xs font-mono text-muted-foreground/50 italic whitespace-pre-wrap select-text">
              -- No DDL available
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
