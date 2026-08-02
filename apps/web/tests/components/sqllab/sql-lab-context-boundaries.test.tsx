/**
 * @file sql-lab-context-boundaries.test.tsx
 * @description Regression coverage for SQLLab editor hot-path context isolation.
 */

import React from "react";
import { act, fireEvent, render, waitFor } from "../../test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useSQLLabMock } = vi.hoisted(() => ({
  useSQLLabMock: vi.fn(),
}));

vi.mock("@/app/sqllab/hooks/useSQLLab", () => ({
  useSQLLab: useSQLLabMock,
}));

import {
  SQLLabProvider,
  useSQLLabContext,
  useSQLLabEditorContext,
  useSQLLabResultContext,
} from "@/app/sqllab/context/SQLLabContext";
import { ResultFooter } from "@/app/sqllab/components/results/ResultFooter";
import { SQLLabToolbar } from "@/app/sqllab/components/SQLLabToolbar";

vi.mock("@/app/sqllab/components/SQLLabDataTable", () => ({
  SQLLabDataTable: ({ columns, data }: { columns: string[]; data: any[] }) => (
    <output data-testid="result-consumer-data">{columns.join(",")}:{data.length}</output>
  ),
}));

vi.mock("@/app/sqllab/components/NoSQLResults", () => ({
  NoSQLResults: ({ data }: { data: any[] }) => <output data-testid="result-consumer-nosql">{data.length}</output>,
}));

vi.mock("@/app/sqllab/components/ProblemsList", () => ({
  ProblemsList: () => <div data-testid="problems-list" />,
}));

vi.mock("@/app/sqllab/components/results/ExplainPlanViewer", () => ({
  ExplainPlanViewer: ({ sql }: { sql: string }) => <output data-testid="explain-sql">{sql}</output>,
}));

vi.mock("@/app/sqllab/components/LineageViewer", () => ({
  LineageViewer: ({ sql }: { sql: string }) => <output data-testid="lineage-sql">{sql}</output>,
}));

vi.mock("@/app/sqllab/components/results/ExportDropdown", () => ({
  ExportDropdown: ({ results, columns }: { results: any[]; columns: string[] }) => (
    <output data-testid="export-props">{columns.join(",")}:{results.length}</output>
  ),
}));

import { SQLLabResultPanel } from "@/app/sqllab/components/SQLLabResultPanel";

function StableConsumer({ onRender }: { onRender: () => void }) {
  onRender();
  const lab = useSQLLabContext();
  return (
    <>
       <span data-testid="stable-value">stable</span>
      <span data-testid="stable-hot-fields">
        {["sql", "tabs", "activeTabId", "activeTab", "cursorPos", "results", "columns", "error", "executing", "executionTime", "currentTData", "currentTColumns", "loadingTData", "activeResultTab"].filter((key) => key in lab).join(",") || "none"}
      </span>
    </>
  );
}

function ResultConsumer({ onRender }: { onRender: () => void }) {
  onRender();
  const result = useSQLLabResultContext();
  return (
    <output data-testid="result-context-value">
      {result.currentTColumns.join(",")}:{result.currentTData.length}:{result.loadingTData ? "loading" : result.executionTime}
    </output>
  );
}

function EditorConsumer({ onRender }: { onRender?: () => void }) {
  onRender?.();
  const editor = useSQLLabEditorContext();
  return (
    <>
       <output data-testid="editor-sql">{editor.sql}</output>
       <output data-testid="editor-result-fields">
         {["results", "columns", "error", "executing", "currentTData", "loadingTData"].filter((key) => key in editor).join(",") || "none"}
       </output>
       <output data-testid="editor-cursor-field">{"cursorPos" in editor ? "present" : "none"}</output>
       {editor.tabs.map((tab) => (
        <button key={tab.id} type="button" onClick={() => editor.setActiveTabId(tab.id)}>
          {tab.name}
        </button>
      ))}
      <button type="button" onClick={() => editor.setSql("SELECT * FROM users;")}>Update SQL</button>
      <button type="button" onClick={() => editor.setCursorPos({ lineNumber: 7, column: 13 })}>
        Move cursor
      </button>
      <ResultFooter
        tabSize={4}
        errorCount={0}
        warningCount={0}
        setActiveTab={vi.fn()}
      />
    </>
  );
}

const stableColumns: string[] = [];
const stableResults: any[] = [];
const stableDataSources: any[] = [];
let updateResults: (() => void) | undefined;
let updateTableData: (() => void) | undefined;

describe("SQLLab editor context boundaries", () => {
  beforeEach(() => {
    updateResults = undefined;
    updateTableData = undefined;
    useSQLLabMock.mockImplementation(() => {
      const [sql, setSql] = React.useState("SELECT 1;");
      const [cursorPos, setCursorPos] = React.useState({ lineNumber: 1, column: 1 });
       const [results, setResults] = React.useState<any[]>([]);
       updateResults = () => setResults([{ id: 1 }]);
       const [tableData, setTableData] = React.useState<any[]>([]);
       updateTableData = () => setTableData([{ id: 2 }]);
       const [loadingTData] = React.useState(false);
       const [activeResultTab, setActiveResultTab] = React.useState("results");
       return {
         sql,
         setSql,
         tabs: [{ id: "1", name: "console_1", results, columns: results.length ? ["id"] : [], error: null }],
         activeTabId: "1",
         setActiveTabId: vi.fn(),
         cursorPos,
        setCursorPos,
         activeResultTab,
         results,
         columns: results.length ? ["id"] : stableColumns,
         error: null,
         executing: false,
         executionTime: tableData.length ? 18 : 0,
         currentTData: tableData,
         currentTColumns: tableData.length ? ["id"] : [],
         loadingTData,
        selectedDSType: "postgresql",
        resultEncoding: "utf-8",
        dataSources: stableDataSources,
        selectedDS: "db-1",
        tabSize: 4,
         setActiveResultTab,
        setFixSQLError: vi.fn(),
      };
    });

   });

   it("keeps result updates out of stable context while updating result consumers", async () => {
     const stableRenders = vi.fn();
     const resultRenders = vi.fn();
     const view = render(
       <SQLLabProvider>
         <StableConsumer onRender={stableRenders} />
         <ResultConsumer onRender={resultRenders} />
       </SQLLabProvider>,
     );

     expect(view.getByTestId("stable-hot-fields")).toHaveTextContent("none");
     expect(stableRenders).toHaveBeenCalledTimes(1);
     expect(resultRenders).toHaveBeenCalledTimes(1);

     await act(async () => {
       updateTableData?.();
     });

     await waitFor(() => expect(view.getByTestId("result-context-value")).toHaveTextContent("id:1:18"));
     expect(stableRenders).toHaveBeenCalledTimes(1);
     expect(resultRenders.mock.calls.length).toBeGreaterThan(1);
   });

  it("keeps unrelated consumers mounted while editor SQL and cursor update", () => {
    const stableRenders = vi.fn();
    const view = render(
      <SQLLabProvider>
        <StableConsumer onRender={stableRenders} />
        <EditorConsumer />
      </SQLLabProvider>,
    );

     expect(view.getByTestId("editor-sql")).toHaveTextContent("SELECT 1;");
     expect(view.getByTestId("editor-result-fields")).toHaveTextContent("none");
     expect(view.getByTestId("editor-cursor-field")).toHaveTextContent("none");
    expect(view.getByText("LN 1, COL 1")).toBeInTheDocument();
    expect(view.getByTestId("stable-hot-fields")).toHaveTextContent("none");
    expect(stableRenders).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByRole("button", { name: "Update SQL" }));
    expect(view.getByTestId("editor-sql")).toHaveTextContent("SELECT * FROM users;");
    expect(stableRenders).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByRole("button", { name: "Move cursor" }));
    expect(view.getByText("LN 7, COL 13")).toBeInTheDocument();
    expect(stableRenders).toHaveBeenCalledTimes(1);
  });

   it("propagates latest SQL to result-derived consumers without rerendering stable consumers", async () => {
    const stableRenders = vi.fn();
    const view = render(
      <SQLLabProvider>
        <StableConsumer onRender={stableRenders} />
        <SQLLabResultPanel />
        <EditorConsumer />
      </SQLLabProvider>,
    );

     fireEvent.click(view.getByRole("button", { name: "Update SQL" }));
     expect(stableRenders).toHaveBeenCalledTimes(1);

     fireEvent.click(view.getByRole("button", { name: "Lineage" }));
      await waitFor(() => expect(view.getByTestId("lineage-sql")).toHaveTextContent("SELECT * FROM users;"));
   });

   it("updates the live result panel without rerendering stable consumers", async () => {
      const stableRenders = vi.fn();
      const editorRenders = vi.fn();
      const view = render(
        <SQLLabProvider>
          <StableConsumer onRender={stableRenders} />
          <EditorConsumer onRender={editorRenders} />
          <SQLLabResultPanel />
        </SQLLabProvider>,
      );

      expect(view.queryByTestId("result-consumer-data")).toBeNull();
      expect(stableRenders).toHaveBeenCalledTimes(1);
      expect(editorRenders).toHaveBeenCalledTimes(1);

      await act(async () => {
        updateResults?.();
      });

      await waitFor(() => expect(view.getByTestId("result-consumer-data")).toHaveTextContent("id:1"));
      expect(stableRenders).toHaveBeenCalledTimes(1);
      expect(editorRenders).toHaveBeenCalledTimes(1);
    });

   it("switches result-derived consumers to the active SQL tab", async () => {
     useSQLLabMock.mockImplementation(() => {
       const [activeTabId, setActiveTabId] = React.useState("1");
       const [activeResultTab, setActiveResultTab] = React.useState("results");
      const tabs = [
        { id: "1", name: "first", sql: "SELECT 1;", results: [{ id: 1 }], columns: ["id"], error: null },
        { id: "2", name: "second", sql: "SELECT 2;", results: [{ id: 2 }, { id: 3 }], columns: ["id"], error: "second tab failed" },
      ];
      const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
      return {
        sql: activeTab.sql,
        setSql: vi.fn(),
        tabs,
        activeTabId,
        setActiveTabId,
        cursorPos: { lineNumber: 1, column: 1 },
        setCursorPos: vi.fn(),
         activeResultTab,
        results: tabs[0].results,
        columns: tabs[0].columns,
        error: tabs[0].error,
        selectedDSType: "postgresql",
        resultEncoding: "utf-8",
        dataSources: stableDataSources,
        selectedDS: "db-1",
        tabSize: 4,
         setActiveResultTab,
        setFixSQLError: vi.fn(),
      };
    });

    const view = render(
      <SQLLabProvider>
        <SQLLabResultPanel />
        <EditorConsumer />
      </SQLLabProvider>,
    );

     expect(view.getByTestId("result-consumer-data")).toHaveTextContent("id:1");
     await waitFor(() => expect(view.getByTestId("export-props")).toHaveTextContent("id:1"));

    fireEvent.click(view.getByRole("button", { name: "second" }));

     expect(view.getByTestId("result-consumer-data")).toHaveTextContent("id:2");
     fireEvent.click(view.getByRole("button", { name: "Messages" }));
     expect(view.getByText("second tab failed")).toBeInTheDocument();
   });

   it("passes the active SQL to the real explain-plan consumer", () => {
     useSQLLabMock.mockReturnValue({
       sql: "EXPLAIN SELECT 1;",
       setSql: vi.fn(),
        tabs: [{ id: "1", name: "explain", results: { isExplain: true, plan: [] }, columns: [], error: null }],
       activeTabId: "1",
       setActiveTabId: vi.fn(),
       cursorPos: { lineNumber: 1, column: 1 },
       setCursorPos: vi.fn(),
       activeResultTab: "results",
       setActiveResultTab: vi.fn(),
        results: { isExplain: true, plan: [] },
       columns: [],
       error: null,
       selectedDSType: "postgresql",
       resultEncoding: "utf-8",
       dataSources: stableDataSources,
       selectedDS: "db-1",
       tabSize: 4,
       executing: false,
       setFixSQLError: vi.fn(),
     });

     const view = render(<SQLLabProvider><SQLLabResultPanel /></SQLLabProvider>);

     return waitFor(() => expect(view.getByTestId("explain-sql")).toHaveTextContent("EXPLAIN SELECT 1;"));
   });

   it("keeps stable consumers mounted while the active tab reference changes on SQL edits", () => {
     // The composed hook exposes the memoized active tab, whose identity changes
     // whenever the tabs array is recreated (SQL edits, results, cursor activity).
     // The stable context must never depend on that identity.
     useSQLLabMock.mockImplementation(() => {
       const [sql, setSql] = React.useState("SELECT 1;");
       const [activeResultTab, setActiveResultTab] = React.useState("results");
       const tabs = [
         { id: "1", name: "console_1", sql, results: stableResults, columns: stableColumns, error: null },
       ];
       const activeTab = tabs[0];
       return {
         sql,
         setSql,
         tabs,
         activeTabId: "1",
         setActiveTabId: vi.fn(),
         activeTab,
         cursorPos: { lineNumber: 1, column: 1 },
         setCursorPos: vi.fn(),
         results: stableResults,
         columns: stableColumns,
         error: null,
         executing: false,
         executionTime: 0,
         currentTData: stableResults,
         currentTColumns: stableColumns,
         loadingTData: false,
         activeResultTab,
         setActiveResultTab,
         selectedDSType: "postgresql",
         resultEncoding: "utf-8",
         dataSources: stableDataSources,
         selectedDS: "db-1",
         tabSize: 4,
         setFixSQLError: vi.fn(),
       };
     });

     const stableRenders = vi.fn();
     const editorRenders = vi.fn();
     const resultRenders = vi.fn();
     const view = render(
       <SQLLabProvider>
         <StableConsumer onRender={stableRenders} />
         <EditorConsumer onRender={editorRenders} />
         <ResultConsumer onRender={resultRenders} />
       </SQLLabProvider>,
     );

     expect(view.getByTestId("stable-hot-fields")).toHaveTextContent("none");
     expect(stableRenders).toHaveBeenCalledTimes(1);

     fireEvent.click(view.getByRole("button", { name: "Update SQL" }));

     expect(view.getByTestId("editor-sql")).toHaveTextContent("SELECT * FROM users;");
     expect(stableRenders).toHaveBeenCalledTimes(1);
     expect(editorRenders.mock.calls.length).toBeGreaterThan(1);
     expect(resultRenders).toHaveBeenCalledTimes(1);
   });

   it("keeps the real toolbar mounted while editor SQL and cursor update", () => {
     useSQLLabMock.mockImplementation(() => {
       const [sql, setSql] = React.useState("SELECT 1;");
       const [cursorPos, setCursorPos] = React.useState({ lineNumber: 1, column: 1 });
       const [activeResultTab, setActiveResultTab] = React.useState("results");
       const tabs = [
         { id: "1", name: "console_1", sql, results: stableResults, columns: stableColumns, error: null },
       ];
       const activeTab = tabs[0];
       return {
         sql,
         setSql,
         tabs,
         activeTabId: "1",
         setActiveTabId: vi.fn(),
         activeTab,
         cursorPos,
         setCursorPos,
         results: stableResults,
         columns: stableColumns,
         error: null,
         executing: false,
         executionTime: 0,
         currentTData: stableResults,
         currentTColumns: stableColumns,
         loadingTData: false,
         activeResultTab,
         setActiveResultTab,
         isRelational: true,
         selectedDSType: "postgresql",
         resultEncoding: "utf-8",
         dataSources: stableDataSources,
         selectedDS: "db-1",
         tabSize: 4,
         queryLimit: 1000,
         setQueryLimit: vi.fn(),
         showRightPanel: true,
         rightPanelMode: "object",
         setShowRightPanel: vi.fn(),
         setRightPanelMode: vi.fn(),
         setShowAISidebar: vi.fn(),
         handleRun: vi.fn(),
         handleStop: vi.fn(),
         handleExplain: vi.fn(),
         handleSave: vi.fn(),
         handleOpen: vi.fn(),
         handleUndo: vi.fn(),
         handleRedo: vi.fn(),
         handleFormat: vi.fn(),
         handleRollback: vi.fn(),
         handleImport: vi.fn(),
         handleExport: vi.fn(),
         setFixSQLError: vi.fn(),
       };
     });

     const toolbarRenders = vi.fn();
     function TrackedToolbar() {
       // Consume the same stable context as the toolbar so the counter reflects
       // stable-context-driven rerenders of the real toolbar subtree.
       useSQLLabContext();
       toolbarRenders();
       return <SQLLabToolbar />;
     }

     const view = render(
       <SQLLabProvider>
         <TrackedToolbar />
         <EditorConsumer />
       </SQLLabProvider>,
     );

     expect(toolbarRenders).toHaveBeenCalledTimes(1);

     fireEvent.click(view.getByRole("button", { name: "Update SQL" }));
     expect(view.getByTestId("editor-sql")).toHaveTextContent("SELECT * FROM users;");
     expect(toolbarRenders).toHaveBeenCalledTimes(1);

     fireEvent.click(view.getByRole("button", { name: "Move cursor" }));
     expect(view.getByText("LN 7, COL 13")).toBeInTheDocument();
     expect(toolbarRenders).toHaveBeenCalledTimes(1);
   });
});
