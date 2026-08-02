/**
 * @file sql-lab-editor-container.test.tsx
 * @description Regression tests for SQLLab editor/AI lifecycle isolation.
 */

import { fireEvent, render, waitFor } from "../../test-utils";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLab, getModelsMock, getAIStatusMock, getRagPipelineStatusMock, getConversationsMock, streamChatMock } =
  vi.hoisted(() => ({
    getLab: vi.fn(),
    getModelsMock: vi.fn(),
    getAIStatusMock: vi.fn(),
    getRagPipelineStatusMock: vi.fn(),
    getConversationsMock: vi.fn(),
    streamChatMock: vi.fn(),
  }));

vi.mock("@/app/sqllab/context/SQLLabContext", () => ({
  useSQLLabContext: getLab,
  useSQLLabEditorContext: getLab,
  useSQLLabResultContext: getLab,
}));

vi.mock("@/lib/monaco/MonacoEditor", () => ({
  SQLEditor: () => <div data-testid="sql-editor" />,
}));

vi.mock("@/app/sqllab/components/ai/AIChatInput", () => ({
  AIChatInput: ({ input, onInputChange, onKeyDown, onSend }: any) => (
    <div>
      <textarea
        aria-label="AI prompt"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <button type="button" onClick={onSend}>Send</button>
    </div>
  ),
  AUTO_MODEL_VALUE: "__auto__",
}));

vi.mock("@/app/sqllab/components/ai/AIChatMessages", () => ({
  AIChatMessages: ({ messages }: any) => (
    <div>
      {messages.map((message: any) => <span key={message.id}>{message.content}</span>)}
    </div>
  ),
}));

vi.mock("@/app/sqllab/components/ai/ConversationHistory", () => ({
  ConversationHistory: () => null,
}));

vi.mock("@/app/sqllab/components/ai/AIDiagnosticsPanel", () => ({
  AIDiagnosticsPanel: () => null,
}));

vi.mock("@/lib/api-client", () => ({
  aiApi: {
    getModels: getModelsMock,
    getAIStatus: getAIStatusMock,
    getRagPipelineStatus: getRagPipelineStatusMock,
    getConversations: getConversationsMock,
    streamChat: streamChatMock,
  },
  databaseApi: {},
}));

const createLab = (
  showAISidebar: boolean,
  sql = "SELECT 1;",
  setShowAISidebar: React.Dispatch<React.SetStateAction<boolean>> = vi.fn(),
) => ({
  tabs: [{ id: "tab-1", name: "Query 1" }],
  activeTabId: "tab-1",
  showAISidebar,
  dataSources: [],
  selectedDS: "db-1",
  selectedDSType: "postgresql",
  selectedSchema: "public",
  selectedTable: "",
  allColumns: [],
  autocompleteColumns: [],
  tables: [],
  sql,
  error: null,
  isRelational: true,
  tabSize: 2,
  undoTrigger: 0,
  redoTrigger: 0,
  setShowAISidebar,
  setShowRightPanel: vi.fn(),
  setActiveTabId: vi.fn(),
  closeTab: vi.fn(),
  addTab: vi.fn(),
  setSql: vi.fn(),
  setCursorPos: vi.fn(),
  handleRun: vi.fn(),
  handleFormat: vi.fn(),
  handleStop: vi.fn(),
  handleSave: vi.fn(),
  fixSQLError: null,
  queryLimit: 500,
  setFixSQLError: vi.fn(),
});

function LabHarness({ Container }: { Container: React.ComponentType }) {
  const [showAISidebar, setShowAISidebar] = React.useState(false);
  const [sql, setSql] = React.useState("SELECT 1;");
  const [fixSQLError, setFixSQLError] = React.useState<string | null>(null);
  const lab = React.useMemo(
    () => ({
      ...createLab(showAISidebar, sql, setShowAISidebar),
      setSql,
      fixSQLError,
      setFixSQLError,
    }),
    [fixSQLError, showAISidebar, sql],
  );

  getLab.mockReturnValue(lab);
  return (
    <>
      <Container />
      <div data-testid="lab-mode">{showAISidebar ? "AI" : "Editor"}</div>
      <button type="button" data-testid="update-sql" onClick={() => setSql("SELECT * FROM users;")}>
        Update SQL
      </button>
      <button type="button" data-testid="fix-with-ai" onClick={() => setFixSQLError("syntax error")}>Fix with AI</button>
    </>
  );
}

const loadContainer = async () => {
  await import("@/app/sqllab/components/AIAssistant");
  return import("@/app/sqllab/components/SQLLabEditorContainer");
};

describe("SQLLabEditorContainer AI lifecycle", () => {
  beforeEach(() => {
    getModelsMock.mockReset();
    getAIStatusMock.mockReset();
    getRagPipelineStatusMock.mockReset();
    getConversationsMock.mockReset();
    streamChatMock.mockReset();

    getModelsMock.mockResolvedValue([]);
    getAIStatusMock.mockResolvedValue({ hasApiKey: true, providers: {} });
    getRagPipelineStatusMock.mockResolvedValue({});
    getConversationsMock.mockResolvedValue([]);
    streamChatMock.mockImplementation(async (_data, onChunk) => {
      onChunk("retained response", "message");
    });
  });

  it("initializes AI lazily and preserves production assistant state through Editor -> AI -> Editor -> AI", async () => {
    const { SQLLabEditorContainer } = await loadContainer();
    const view = render(<LabHarness Container={SQLLabEditorContainer} />);

    expect(getModelsMock).not.toHaveBeenCalled();
    expect(getConversationsMock).not.toHaveBeenCalled();
    expect(streamChatMock).not.toHaveBeenCalled();
    expect(view.getByTestId("lab-mode")).toHaveTextContent("Editor");

    fireEvent.click(view.getByTitle("AI Assistant"));
    const prompt = await waitFor(() =>
      view.getByRole("textbox"),
    );
    expect(view.getByTestId("lab-mode")).toHaveTextContent("AI");
    await waitFor(() => {
      expect(getModelsMock).toHaveBeenCalledTimes(1);
      expect(getConversationsMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(prompt, { target: { value: "keep this prompt" } });
    fireEvent.keyDown(prompt, { key: "Enter" });
    await waitFor(() => expect(view.getByText("retained response")).toBeInTheDocument());
    expect(streamChatMock).toHaveBeenCalledTimes(1);
    fireEvent.change(prompt, { target: { value: "keep this prompt" } });

    fireEvent.click(view.getByText("Query 1"));
    expect(view.queryByRole("textbox")).not.toBeInTheDocument();
    expect(view.getByTestId("lab-mode")).toHaveTextContent("Editor");

    fireEvent.click(view.getByTitle("AI Assistant"));
    const promptAfterReturning = await waitFor(() => view.getByDisplayValue("keep this prompt"));
    expect(view.getByTestId("lab-mode")).toHaveTextContent("AI");
    expect(promptAfterReturning).toBeInTheDocument();
    expect(view.getByText("retained response")).toBeInTheDocument();
    expect(getModelsMock).toHaveBeenCalledTimes(1);
    expect(getConversationsMock).toHaveBeenCalledTimes(1);
    expect(streamChatMock).toHaveBeenCalledTimes(1);

    fireEvent.click(view.getByText("Query 1"));
    expect(view.getByTestId("lab-mode")).toHaveTextContent("Editor");
    fireEvent.click(view.getByTitle("AI Assistant"));
    expect(view.getByTestId("lab-mode")).toHaveTextContent("AI");
    expect(await waitFor(() => view.getByDisplayValue("keep this prompt"))).toBeInTheDocument();
  }, 10000);

  it("does not request AI again when SQL changes while the editor is active", async () => {
    const { SQLLabEditorContainer } = await loadContainer();
    const view = render(<LabHarness Container={SQLLabEditorContainer} />);

    fireEvent.click(view.getByTitle("AI Assistant"));
    await waitFor(() => view.getByRole("textbox"));
    const callsAfterActivation = {
      models: getModelsMock.mock.calls.length,
      conversations: getConversationsMock.mock.calls.length,
      streams: streamChatMock.mock.calls.length,
    };

    fireEvent.click(view.getByText("Query 1"));
    fireEvent.click(view.getByTestId("update-sql"));
    expect(getModelsMock).toHaveBeenCalledTimes(callsAfterActivation.models);
    expect(getConversationsMock).toHaveBeenCalledTimes(callsAfterActivation.conversations);
    expect(streamChatMock).toHaveBeenCalledTimes(callsAfterActivation.streams);
  });

  it("activates AI and sends a pending fix error from the inactive Editor", async () => {
    const { SQLLabEditorContainer } = await loadContainer();
    const view = render(<LabHarness Container={SQLLabEditorContainer} />);

    expect(view.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(view.getByTestId("fix-with-ai"));

    await waitFor(() => expect(view.getByRole("textbox")).toBeInTheDocument());
    await waitFor(() => expect(streamChatMock).toHaveBeenCalledTimes(1));
    expect(streamChatMock.mock.calls[0][0].text).toContain("syntax error");
    expect(streamChatMock.mock.calls[0][0].text).toContain("SELECT 1;");
  });

  it("activates the production AI tab with Enter and Space", async () => {
    const { SQLLabEditorContainer } = await loadContainer();
    const view = render(<LabHarness Container={SQLLabEditorContainer} />);
    const aiTab = view.getByTitle("AI Assistant");

    fireEvent.keyDown(aiTab, { key: "Enter" });
    await waitFor(() => view.getByRole("textbox"));
    fireEvent.click(view.getByText("Query 1"));
    fireEvent.keyDown(aiTab, { key: " " });

    expect(
      await waitFor(() => view.getByRole("textbox")),
    ).toBeInTheDocument();
    expect(getModelsMock).toHaveBeenCalledTimes(1);
  });
});
