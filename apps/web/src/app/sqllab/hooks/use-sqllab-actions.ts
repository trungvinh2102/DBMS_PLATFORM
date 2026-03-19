/**
 * @file use-sqllab-actions.ts
 * @description Hook to manage SQLLab actions like file import, export, and formatting.
 */

import { useCallback } from "react";
import { toast } from "sonner";

export function useSQLLabActions() {
  const handleImport = useCallback((onContentLoaded: (content: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sql,.txt";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        onContentLoaded(content);
        toast.success("File imported successfully");
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleExport = useCallback((sql: string, dbId?: string) => {
    if (!sql) {
      toast.error("No SQL to export");
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([sql], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `query_${dbId || "export"}_${new Date().getTime()}.sql`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("SQL script exported");
  }, []);

  return {
    handleImport,
    handleExport,
  };
}
