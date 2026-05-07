/**
 * @file useAIChat.ts
 * @description Custom hook for managing AI chat state, streaming responses, and parsing content.
 */

import { useState, useCallback } from "react";
import { aiApi } from "../../../lib/api-client";
import { toast } from "sonner";
import { Message, AIStep } from "../components/ai/types";

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

    // Extract all thinking and tool call sections, then group them by type
    const steps: AIStep[] = [];
    const thinkingContent: string[] = [];
    const toolActions: string[] = [];

    // Regular expression to find both thinking and tool_call tags
    const stepRegex = /<(thinking|tool_call)(?:\s+name="([^"]*)")?(?:\s+intent="([^"]*)")?(?:\s+\/>|>([\s\S]*?)<\/\1>)/gi;
    let stepMatch;

    while ((stepMatch = stepRegex.exec(text)) !== null) {
      const [_, type, name, intent, innerContent] = stepMatch;
      if (type === "thinking") {
        const content = (innerContent || "").trim();
        if (content) thinkingContent.push(content);
      } else if (type === "tool_call") {
        toolActions.push(intent || `Action: ${name}`);
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
    if (toolActions.length > 0) {
      steps.push({
        type: "tool_call",
        content: toolActions.join("\n"),
        name: "Actions"
      });
    }

    // Extract the final thought text for historical reference (joined)
    thought = thinkingContent.join("\n\n");

    // Clean content by removing all thinking and tool_call blocks
    // We use a more aggressive approach to catch dangling tags or mismatched blocks
    content = text
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

    return { content, thought, sql, analysis, steps };
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
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    let fullContent = "";
    try {
      await aiApi.streamChat(
        {
          text: input,
          databaseId,
          schema: schema || "public",
          modelId: selectedModel,
          conversationId: conversationId || undefined,
        },
        (chunk, event) => {
          // Internal state tracking for structured history
          const lastOpen = fullContent.lastIndexOf("<thinking>");
          const lastClose = fullContent.lastIndexOf("</thinking>");
          const isInsideThinking = lastOpen > lastClose;

          if (event === "thinking") {
            if (!isInsideThinking) {
              fullContent += `<thinking>${chunk}`;
            } else {
              fullContent += chunk;
            }
          } else if (event === "tool_call") {
            // Ensure any open thinking is closed before tool metadata
            if (isInsideThinking) {
              fullContent += "</thinking>";
            }
            try {
              const toolData = typeof chunk === "string" ? JSON.parse(chunk) : chunk;
              const intent = toolData.args?.intent || toolData.name;
              fullContent += `<tool_call name="${toolData.name}" intent="${intent}" />`;
            } catch (e) {
              fullContent += `<tool_call name="unknown" intent="Invoking tool..." />`;
            }
          } else if (event !== "error") {
            // For other events (message, sql, confidence, etc.), do NOT force-close thinking.
            // The backend may switch event types before the closing </thinking> tag is emitted.
            // We let fullContent accumulate and the parser handles the tags naturally.
            fullContent += chunk;
          }

          // Parse the accumulating content to extract steps, sql, content, etc.
          const parsed = parseMessageContent({ role: "assistant", content: fullContent });

          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMsgId) return m;

            if (event === "error") {
              return {
                ...m,
                content: `Error: ${chunk}`,
                isActionable: false
              };
            }

            return {
              ...m,
              ...parsed,
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
        m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}` } : m
      ));
    } finally {
      setIsTyping(false);
    }
  }, [databaseId, schema, selectedModel, isTyping, conversationId, parseMessageContent, loadConversations]);

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
