/**
 * @file useAIChat.ts
 * @description Custom hook for managing AI chat state, streaming responses, and parsing content.
 */

import { useState, useCallback } from "react";
import { aiApi } from "../../../lib/api-client";
import { toast } from "sonner";
import { Message, AIStep } from "../components/ai/types";

const serializeMessageContent = (message: Message) => {
  const parts = [message.content, message.sql ? `\`\`\`sql\n${message.sql}\n\`\`\`` : "", message.analysis].filter(Boolean);
  return parts.join("\n\n").trim();
};

const formatToolCallContent = (toolData: any) => {
  const args = toolData?.args && typeof toolData.args === "object"
    ? Object.entries(toolData.args)
        .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
        .join("\n")
    : "";

  return toolData?.args?.intent || args || "Invoking tool...";
};

const parsePersistedToolCall = (name?: string, intent?: string, innerContent?: string): AIStep => {
  const rawContent = (innerContent || "").trim();

  if (rawContent) {
    try {
      const toolData = JSON.parse(rawContent);
      return {
        type: "tool_call",
        name: toolData.name || name || "Tool",
        content: formatToolCallContent(toolData),
        args: toolData.args,
        status: "complete",
      };
    } catch {
      return {
        type: "tool_call",
        name: name || "Tool",
        content: intent || rawContent,
        status: "complete",
      };
    }
  }

  return {
    type: "tool_call",
    name: name || "Tool",
    content: intent || (name ? `Action: ${name}` : "Invoking tool..."),
    status: "complete",
  };
};

const STATUS_THINKING_EVENTS = new Set([
  "Initializing context...",
  "Analyzing schema...",
  "Learning from your feedback...",
  "Sẵn sàng.",
  "Khởi tạo xong.",
]);

export function useAIChat(databaseId?: string, schema?: string, selectedModel?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isFetchingConversation, setIsFetchingConversation] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  const parseMessageContent = useCallback((message: any): Partial<Message> => {
    if (message.role === "user") return { content: message.content };

    let text = message.content.trim();

    // 1. Check if content is JSON (New Agent format)
    if (text.startsWith("{") && (text.endsWith("}") || text.includes("}"))) {
      try {
        // Find last matching brace in case of trailing junk
        const lastBrace = text.lastIndexOf("}");
        const jsonStr = text.substring(0, lastBrace + 1);
        const data = JSON.parse(jsonStr);

        return {
          content: data.summary || data.content || "",
          explanation: data.explanation || "",
          thought: data.thinking || data.thought || "", // Map from standard keys
          sql: data.sql || "",
          analysis: data.analysis || "",
          confidence: data.confidence,
          columns: data.columns,
          data: data.data,
          suggestions: data.suggestions,
        };
      } catch (e) {
        console.warn("Failed to parse JSON message, falling back to regex", e);
      }
    }

    // 2. Legacy Streamed / Text Format extraction
    let content = text;
    let thought = "";
    let sql = "";
    let analysis = "";
    let confidence: number | undefined;

    const confidenceMatch = text.match(/<confidence>([\s\S]*?)<\/confidence>/i);
    if (confidenceMatch) {
      const parsedConfidence = Number(confidenceMatch[1].trim());
      if (!Number.isNaN(parsedConfidence)) confidence = parsedConfidence;
    }

    // Extract all thinking and tool call sections, then group them by type
    const steps: AIStep[] = [];
    const thinkingContent: string[] = [];
    const toolSteps: AIStep[] = [];

    // Regular expression to find both thinking and tool_call tags
    const stepRegex = /<(thinking|tool_call)(?:\s+name="([^"]*)")?(?:\s+intent="([^"]*)")?(?:\s+\/>|>([\s\S]*?)<\/\1>)/gi;
    let stepMatch;

    while ((stepMatch = stepRegex.exec(text)) !== null) {
      const [_, type, name, intent, innerContent] = stepMatch;
      if (type === "thinking") {
        const content = (innerContent || "").trim();
        if (content) thinkingContent.push(content);
      } else if (type === "tool_call") {
        toolSteps.push(parsePersistedToolCall(name, intent, innerContent));
      }
    }

    // Handle partial thinking block at the end of the stream
    const partialThoughtRegex = /<thinking>([\s\S]*)$/i;
    const partialMatch = text.match(partialThoughtRegex);
    if (partialMatch && !text.includes("</thinking>", partialMatch.index)) {
      const content = partialMatch[1].trim();
      if (content) thinkingContent.push(content);
    }

    // 1. Consolidated Reasoning Step
    if (thinkingContent.length > 0 || (partialMatch && !text.includes("</thinking>", partialMatch.index))) {
      steps.push({
        type: "thinking",
        content: thinkingContent.join("\n\n") || "Analyzing..."
      });
    }

    // 2. Consolidated Tool Step
    steps.push(...toolSteps);

    // Extract the final thought text for historical reference (joined)
    thought = thinkingContent.join("\n\n");

    // Clean content by removing all thinking and tool_call blocks
    // We use a more aggressive approach to catch dangling tags or mismatched blocks
    content = text
      .replace(/<confidence>[\s\S]*?<\/confidence>/gi, "")
      .replace(/<(thinking|tool_call)[\s\S]*?(?:<\/\1>|\/>)/gi, "") // Remove balanced blocks
      .replace(/<thinking>[\s\S]*/gi, "") // Remove any unclosed opening tag and everything after
      .replace(/<\/thinking>/gi, "")      // Remove any dangling closing tags
      .replace(/<tool_call[^>]*\/>/gi, "") // Remove any standalone tool tags
      .replace(/thinking>/gi, "")         // Remove common malformed remnants
      .replace(/<\/thinking/gi, "")
      .trim();

    // Extract SQL Block
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      sql = sqlMatch[1].trim();
      content = content.replace(sqlMatch[0], "").trim();
    } else {
      const partialSql = content.match(/```sql\n([\s\S]*)/);
      if (partialSql) {
        sql = partialSql[1].trim();
        content = content.replace(partialSql[0], "").trim();
      }
    }

    // Extract Analysis Section
    const analysisMatch = content.match(/### ANALYSIS:([\s\S]*)/i);
    if (analysisMatch) {
      analysis = analysisMatch[1].trim();
      content = content.replace(analysisMatch[0], "").trim();
    }

    if (!content && (thought || sql)) {
      content = "";
    }

    return { content, thought, sql, analysis, confidence, steps };
  }, []);

  const addAssistantMessage = useCallback((content: string, sql?: string, explanation?: string, isActionable = true) => {
    const msg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content,
      sql,
      explanation,
      isActionable,
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const loadHistory = async (dbId?: string) => {
    setIsFetchingConversation(true);
    setMessages([]);
    try {
      const history = await aiApi.getHistory(dbId);
      if (history && history.length > 0) {
        setMessages(history.map((m: any) => ({
          id: m.id,
          role: m.role,
          ...parseMessageContent(m),
          isActionable: m.role === "assistant"
        } as Message)));
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    } finally {
      setIsFetchingConversation(false);
    }
  };

  const loadConversations = useCallback(async (dbId?: string) => {
    setIsLoadingConversations(true);
    try {
      const list = await aiApi.getConversations(dbId);
      setConversations(list);
    } catch (e) {
      console.error("Failed to load conversation list", e);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsFetchingConversation(true);
    setMessages([]); // Clear immediately to show skeletons
    try {
      const res = await aiApi.getConversationMessages(id);
      setConversationId(res.id);
      if (res.messages) {
        setMessages(res.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          ...parseMessageContent(m),
          isActionable: m.role === "assistant"
        } as Message)));
      }
    } catch (e) {
      toast.error("Failed to load conversation");
    } finally {
      setIsFetchingConversation(false);
    }
  }, [parseMessageContent]);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  const handleSend = useCallback(async (input: string) => {
    if (!input.trim() || isTyping || !databaseId) {
      if (!databaseId) toast.error("Connect a database first.");
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      isActionable: true,
      isStreaming: true,
      steps: [],
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    let responseContent = "";
    let sqlContent = "";
    let analysisContent = "";
    let confidenceScore: number | undefined;
    let streamSteps: AIStep[] = [];
    let lastStreamEvent = "";
    try {
      const chatMessages = [
        ...messages
          .map((message) => ({
            role: message.role,
            content: serializeMessageContent(message),
          }))
          .filter((message) => message.content),
        { role: "user", content: input },
      ];

      await aiApi.streamChat(
        {
          text: input,
          messages: chatMessages,
          databaseId,
          schema: schema || "public",
          modelId: selectedModel || undefined,
          conversationId: conversationId || undefined,
        },
        (chunk, event) => {
          if (event === "thinking") {
            const text = String(chunk || "").trim();
            if (!text) return;

            const lastStep = streamSteps[streamSteps.length - 1];
            const isStatusEvent = STATUS_THINKING_EVENTS.has(text);
            if (lastStreamEvent === "thinking" && lastStep?.type === "thinking" && !isStatusEvent) {
              streamSteps = [
                ...streamSteps.slice(0, -1),
                { ...lastStep, content: `${lastStep.content}${text.startsWith("\n") ? "" : "\n"}${text}`, status: "active" },
              ];
            } else {
              streamSteps = [
                ...streamSteps.map((step) => ({ ...step, status: "complete" as const })),
                { type: "thinking", content: text, status: "active" },
              ];
            }
            lastStreamEvent = "thinking";
          } else if (event === "tool_call") {
            try {
              const toolData = typeof chunk === "string" ? JSON.parse(chunk) : chunk;
              streamSteps = [
                ...streamSteps.map((step) => ({ ...step, status: "complete" as const })),
                {
                  type: "tool_call",
                  name: toolData.name || "Tool",
                  content: formatToolCallContent(toolData),
                  args: toolData.args,
                  status: "complete",
                },
              ];
            } catch (e) {
              streamSteps = [
                ...streamSteps.map((step) => ({ ...step, status: "complete" as const })),
                { type: "tool_call", name: "Tool", content: "Invoking tool...", status: "complete" },
              ];
            }
            lastStreamEvent = "tool_call";
          } else if (event === "confidence") {
            const parsedConfidence = Number(String(chunk || "").trim());
            if (!Number.isNaN(parsedConfidence)) confidenceScore = parsedConfidence;
            streamSteps = streamSteps.map((step) => ({ ...step, status: "complete" as const }));
            lastStreamEvent = "confidence";
          } else if (event === "sql") {
            sqlContent += String(chunk || "");
            streamSteps = streamSteps.map((step) => ({ ...step, status: "complete" as const }));
            lastStreamEvent = "sql";
          } else if (event === "analysis") {
            analysisContent += String(chunk || "");
            streamSteps = streamSteps.map((step) => ({ ...step, status: "complete" as const }));
            lastStreamEvent = "analysis";
          } else if (event !== "error") {
            responseContent += String(chunk || "");
            streamSteps = streamSteps.map((step) => ({ ...step, status: "complete" as const }));
            lastStreamEvent = event || "message";
          }

          const parsed = parseMessageContent({ role: "assistant", content: responseContent });

          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMsgId) return m;

            if (event === "error") {
              return {
                ...m,
                content: `Error: ${chunk}`,
                isActionable: false,
                isStreaming: false,
              };
            }

            return {
              ...m,
              ...parsed,
              sql: parsed.sql || sqlContent.trim(),
              analysis: parsed.analysis || analysisContent.trim(),
              confidence: parsed.confidence ?? confidenceScore,
              thought: streamSteps.filter((step) => step.type === "thinking").map((step) => step.content).join("\n\n"),
              steps: streamSteps,
              isStreaming: true,
              isActionable: true
            };
          }));
        },
        (headers) => {
          const cid = headers.get("X-Conversation-Id");
          if (cid && !conversationId) {
            setConversationId(cid);
            loadConversations(databaseId);
          }
        }
      );

    } catch (error: any) {
      toast.error(error.message || "Failed to generate SQL");
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}`, isStreaming: false } : m
      ));
    } finally {
      setIsTyping(false);
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
              ...m,
              isStreaming: false,
              steps: m.steps?.map((step) => ({ ...step, status: "complete" as const })),
            }
          : m
      ));
    }
  }, [databaseId, schema, selectedModel, isTyping, conversationId, messages, parseMessageContent, loadConversations]);

  return {
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    isFetchingConversation,
    isLoadingConversations,
    handleSend,
    loadHistory,
    loadConversations,
    loadConversation,
    startNewChat,
    conversations,
    conversationId,
    addAssistantMessage
  };
}
