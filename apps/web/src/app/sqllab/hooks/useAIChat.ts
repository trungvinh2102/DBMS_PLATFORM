/**
 * @file useAIChat.ts
 * @description Custom hook for managing AI chat state, streaming responses, and parsing content.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { aiApi } from "../../../lib/api-client";
import { toast } from "sonner";
import { AISuggestion, Message, AIStep } from "../components/ai/types";

const ACTIVE_CONVERSATION_STORAGE_PREFIX = "sqllab_ai_active_conversation";
const INITIAL_ASSISTANT_ACTIVITY = "Đang kết nối trợ lý...";

export const getActiveAIConversationStorageKey = (databaseId?: string) =>
  `${ACTIVE_CONVERSATION_STORAGE_PREFIX}:${databaseId || "global"}`;

const getStoredActiveConversationId = (databaseId?: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(getActiveAIConversationStorageKey(databaseId));
  } catch (error) {
    console.error("Failed to read active AI conversation", error);
    return null;
  }
};

const storeActiveConversationId = (databaseId: string | undefined, id: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getActiveAIConversationStorageKey(databaseId), id);
  } catch (error) {
    console.error("Failed to store active AI conversation", error);
  }
};

const clearStoredActiveConversationId = (databaseId?: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(getActiveAIConversationStorageKey(databaseId));
  } catch (error) {
    console.error("Failed to clear active AI conversation", error);
  }
};

const serializeMessageContent = (message: Message) => {
  const parts = [message.content, message.sql ? `\`\`\`sql\n${message.sql}\n\`\`\`` : "", message.analysis].filter(Boolean);
  return parts.join("\n\n").trim();
};

export const STATUS_THINKING_EVENTS = new Set([
  "Đang kết nối trợ lý...",
  "Đang chuẩn bị phản hồi...",
  "Initializing context...",
  "Analyzing schema...",
  "Learning from your feedback...",
  "Ready.",
  "Initialization complete.",
  "Generating SQL...",
  "Testing generated SQL safely...",
  "SQL preview passed.",
  "Đang kiểm tra model và hạn mức...",
  "Đang khởi tạo bối cảnh...",
  "Phân tích lược đồ...",
  "Đang phân tích lược đồ...",
  "Học hỏi từ phản hồi của các bạn...",
  "Đang học từ phản hồi của bạn...",
  "Sẵn sàng.",
  "Khởi tạo xong.",
  "Đang tạo SQL...",
  "Đang kiểm tra SQL đã tạo một cách an toàn...",
  "Đang chạy thử SQL đã tạo một cách an toàn...",
  "SQL preview đã đạt kiểm tra.",
  "SQL đã chạy thử thành công.",
]);

const THINKING_STATUS_TRANSLATIONS: Record<string, string> = {
  "Initializing context...": "Đang khởi tạo bối cảnh...",
  "Analyzing schema...": "Đang phân tích lược đồ...",
  "Learning from your feedback...": "Đang học từ phản hồi của bạn...",
  "Ready.": "Sẵn sàng.",
  "Initialization complete.": "Khởi tạo xong.",
  "Generating SQL...": "Đang tạo SQL...",
  "Testing generated SQL safely...": "Đang chạy thử SQL đã tạo một cách an toàn...",
  "SQL preview passed.": "SQL đã chạy thử thành công.",
  "Đang kiểm tra SQL đã tạo một cách an toàn...": "Đang chạy thử SQL đã tạo một cách an toàn...",
  "SQL preview đã đạt kiểm tra.": "SQL đã chạy thử thành công.",
  "Phân tích lược đồ...": "Đang phân tích lược đồ...",
  "Học hỏi từ phản hồi của các bạn...": "Đang học từ phản hồi của bạn...",
};

const SQL_REPAIR_STATUS_PATTERN = /^(?:Preview failed; repairing SQL|Preview thất bại; đang sửa SQL|Bản chạy thử thất bại; đang sửa SQL) \((\d+)\/(\d+)\)\.\.\.$/;

export const isStatusThinkingEvent = (text: string) => {
  const trimmed = text.trim();
  return STATUS_THINKING_EVENTS.has(trimmed) || SQL_REPAIR_STATUS_PATTERN.test(trimmed);
};

export const translateThinkingStatus = (text: string) => {
  const trimmed = String(text || "").trim();
  const translated = THINKING_STATUS_TRANSLATIONS[trimmed];
  if (translated) return translated;

  const repairMatch = trimmed.match(SQL_REPAIR_STATUS_PATTERN);
  if (repairMatch) return `Bản chạy thử thất bại; đang sửa SQL (${repairMatch[1]}/${repairMatch[2]})...`;

  return text;
};

const translateThinkingContent = (text: string) =>
  String(text || "")
    .split(/\n\n/)
    .map((part) => translateThinkingStatus(part))
    .join("\n\n");

const LABELED_THINKING_EVENT_PATTERN = /^(Intent|Schema mapping|Strategy):/i;
const THINKING_LABEL_PATTERN = /^\s*(Intent|Schema mapping|Strategy):\s*/i;

export const isLabeledThinkingEvent = (text: string) => LABELED_THINKING_EVENT_PATTERN.test(text.trim());

export const stripThinkingLabel = (text: string) => String(text || "").replace(THINKING_LABEL_PATTERN, "");

const toThinkingSteps = (events: any[]): AIStep[] => {
  return events.reduce<AIStep[]>((steps, event) => {
    if (event?.type !== "thinking" || !event?.content) return steps;

    const rawText = String(event.content);
    const text = rawText.trim();
    if (!text) return steps;
    const displayText = translateThinkingStatus(stripThinkingLabel(text).trim());
    const displayRawText = stripThinkingLabel(rawText);
    if (!displayText) return steps;

    const lastStep = steps[steps.length - 1];
    const shouldStartStep =
      !lastStep ||
      isStatusThinkingEvent(text) ||
      isStatusThinkingEvent(lastStep.content) ||
      isLabeledThinkingEvent(text);

    if (shouldStartStep) {
      return [...steps, { type: "thinking", content: displayText, status: "complete" }];
    }

    return [
      ...steps.slice(0, -1),
      { ...lastStep, content: `${lastStep.content}${displayRawText}` },
    ];
  }, []);
};

const INTERNAL_TOOL_NAMES = new Set(["SchemaContextLoader", "RetrievalTrace"]);

const findJsonObjectEnd = (text: string, startIndex: number) => {
  let depth = 0;
  let isInString = false;
  let isEscaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = isInString;
      continue;
    }

    if (char === '"') {
      isInString = !isInString;
      continue;
    }

    if (isInString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return index + 1;
  }

  return -1;
};

const isInternalToolEnvelope = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const payload = value as { name?: unknown; args?: unknown };
  return typeof payload.name === "string" && INTERNAL_TOOL_NAMES.has(payload.name) && Boolean(payload.args);
};

const normalizeSuggestions = (value: unknown): AISuggestion[] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<AISuggestion[]>((items, item) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) items.push({ label: text, prompt: text, intent: "other" });
      return items;
    }

    if (!item || typeof item !== "object") return items;

    const candidate = item as Partial<AISuggestion>;
    const prompt = typeof candidate.prompt === "string" ? candidate.prompt.trim() : "";
    const label = typeof candidate.label === "string" ? candidate.label.trim() : prompt;
    if (!prompt || !label) return items;

    items.push({
      label,
      prompt,
      intent: candidate.intent || "other",
    });
    return items;
  }, []).slice(0, 4);
};

const stripSuggestionCodeFence = (value: string) => {
  const text = value.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : text;
};

const parseSuggestionJson = (value: string): unknown => {
  const text = stripSuggestionCodeFence(value);
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
  }
  return JSON.parse(text);
};

const parseSuggestionsContent = (value: string): AISuggestion[] => {
  const text = value.trim();
  if (!text) return [];

  try {
    return normalizeSuggestions(parseSuggestionJson(text));
  } catch {
    return [];
  }
};

const normalizeUserMessageContent = (content: string) => {
  const text = String(content || "");
  const isAnalyzeResultsPrompt =
    text.includes("Phân tích kết quả query hiện tại trong SQL Lab") ||
    (text.includes("Sample rows:") && text.includes("Columns:") && text.includes("SQL hiện tại:"));

  return isAnalyzeResultsPrompt ? "Phân tích kết quả query hiện tại trong SQL Lab" : text;
};

export const stripInternalToolEnvelopes = (text: string) => {
  let cleaned = "";
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "{") {
      cleaned += text[index];
      index += 1;
      continue;
    }

    const endIndex = findJsonObjectEnd(text, index);
    if (endIndex < 0) {
      cleaned += text.slice(index);
      break;
    }

    const candidate = text.slice(index, endIndex);
    try {
      if (isInternalToolEnvelope(JSON.parse(candidate))) {
        index = endIndex;
        while (text[index] === "\n" || text[index] === "\r" || text[index] === " " || text[index] === "\t") index += 1;
        continue;
      }
    } catch {
      // Not a JSON envelope; keep rendering the original text.
    }

    cleaned += candidate;
    index = endIndex;
  }

  return cleaned.trim();
};

interface SendAIMessageOptions {
  taskKey?: string;
  displayContent?: string;
}

export function useAIChat(databaseId?: string, schema?: string, selectedModel?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isFetchingConversation, setIsFetchingConversation] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const restoredConversationRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const parseMessageContent = useCallback((message: any): Partial<Message> => {
    if (message.role === "user") return { content: normalizeUserMessageContent(message.content) };

    if (message.events || message.sql || message.analysis || message.thought || message.confidence !== undefined) {
      const steps = Array.isArray(message.events) ? toThinkingSteps(message.events) : undefined;

      return {
        content: message.content || "",
        explanation: message.explanation || "",
        thought: translateThinkingContent(message.thought || message.thinking || ""),
        sql: message.sql || "",
        analysis: message.analysis || "",
        confidence: message.confidence,
        columns: message.columns,
        data: message.data,
        suggestions: normalizeSuggestions(message.suggestions),
        citations: message.citations,
        retrievalTrace: message.retrievalTrace,
        warnings: message.warnings,
        steps,
      };
    }

    let text = stripInternalToolEnvelopes(message.content).trim();

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
          thought: translateThinkingContent(data.thinking || data.thought || ""), // Map from standard keys
          sql: data.sql || "",
          analysis: data.analysis || "",
          confidence: data.confidence,
          columns: data.columns,
          data: data.data,
          suggestions: normalizeSuggestions(data.suggestions),
          citations: data.citations,
          retrievalTrace: data.retrievalTrace,
          warnings: data.warnings,
          steps: Array.isArray(data.events) ? toThinkingSteps(data.events) : undefined,
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

    // Extract all thinking sections as user-visible assistant activity.
    const steps: AIStep[] = [];
    const thinkingContent: string[] = [];

    // Regular expression also matches legacy tool_call tags so they can be stripped later.
    const stepRegex = /<(thinking|tool_call)(?:\s+name="([^"]*)")?(?:\s+intent="([^"]*)")?(?:\s+\/>|>([\s\S]*?)<\/\1>)/gi;
    let stepMatch;

    while ((stepMatch = stepRegex.exec(text)) !== null) {
      const [, type, , , innerContent] = stepMatch;
      if (type === "thinking") {
        const content = translateThinkingStatus(stripThinkingLabel(innerContent || "").trim());
        if (content) {
          thinkingContent.push(content);
          steps.push({
            type: "thinking",
            content,
            status: "complete",
          });
        }
      }
    }

    // Handle partial thinking block at the end of the stream
    const partialThoughtRegex = /<thinking>([\s\S]*)$/i;
    const partialMatch = text.match(partialThoughtRegex);
    if (partialMatch && !text.includes("</thinking>", partialMatch.index)) {
      const content = partialMatch[1].trim();
      if (content) thinkingContent.push(translateThinkingStatus(stripThinkingLabel(content).trim()));
    }

    if (!steps.length && (thinkingContent.length > 0 || (partialMatch && !text.includes("</thinking>", partialMatch.index)))) {
      steps.push({
        type: "thinking",
        content: thinkingContent.join("\n\n") || "Đang phân tích...",
        status: "complete",
      });
    }

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
      storeActiveConversationId(databaseId, res.id);
      if (res.messages) {
        setMessages(res.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          ...parseMessageContent(m),
          isActionable: m.role === "assistant"
        } as Message)));
      }
    } catch (e) {
      clearStoredActiveConversationId(databaseId);
      setConversationId(null);
      toast.error("Failed to load conversation");
    } finally {
      setIsFetchingConversation(false);
    }
  }, [databaseId, parseMessageContent]);

  useEffect(() => {
    const activeConversationId = getStoredActiveConversationId(databaseId);
    if (!activeConversationId) {
      restoredConversationRef.current = null;
      return;
    }

    if (conversationId === activeConversationId || restoredConversationRef.current === activeConversationId) return;

    restoredConversationRef.current = activeConversationId;
    loadConversation(activeConversationId);
  }, [conversationId, databaseId, loadConversation]);

  const startNewChat = useCallback(() => {
    clearStoredActiveConversationId(databaseId);
    restoredConversationRef.current = null;
    setConversationId(null);
    setMessages([]);
  }, [databaseId]);

  const handleSend = useCallback(async (input: string, options?: SendAIMessageOptions) => {
    if (!input.trim() || isTyping || !databaseId) {
      if (!databaseId) toast.error("Connect a database first.");
      return;
    }

    setIsTyping(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: options?.displayContent || input,
    };
    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      isActionable: true,
      isStreaming: true,
      steps: [{ type: "thinking", content: INITIAL_ASSISTANT_ACTIVITY, status: "active" }],
    };

    setMessages(prev => [...prev, userMsg, initialAssistantMsg]);

    let responseContent = "";
    let sqlContent = "";
    let analysisContent = "";
    let confidenceScore: number | undefined;
    let citations: Message["citations"] = [];
    let retrievalTrace: Message["retrievalTrace"];
    let warnings: string[] = [];
    let suggestions: AISuggestion[] = [];
    let suggestionsContent = "";
    let streamSteps: AIStep[] = [];
    let lastStreamEvent = "";
    let lastParsedContent = "";
    let lastParsedMessage: Partial<Message> = parseMessageContent({ role: "assistant", content: "" });
    let streamThought = "";
    let pendingAssistantEvent: string | undefined;
    let pendingAssistantChunk: unknown;
    let scheduledAssistantFrame: number | null = null;

    const completeStreamSteps = () => {
      streamSteps = streamSteps.map((step) => ({ ...step, status: "complete" as const }));
      streamThought = streamSteps.filter((step) => step.type === "thinking").map((step) => step.content).join("\n\n");
    };

    const getParsedMessage = () => {
      if (responseContent !== lastParsedContent) {
        lastParsedContent = responseContent;
        lastParsedMessage = parseMessageContent({ role: "assistant", content: responseContent });
      }

      return lastParsedMessage;
    };

    const flushAssistantMessage = () => {
      if (scheduledAssistantFrame !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(scheduledAssistantFrame);
        scheduledAssistantFrame = null;
      }

      const event = pendingAssistantEvent;
      const chunk = pendingAssistantChunk;
      pendingAssistantEvent = undefined;
      pendingAssistantChunk = undefined;
      const parsed = getParsedMessage();

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
          citations,
          retrievalTrace,
          warnings,
          suggestions: parsed.suggestions?.length ? parsed.suggestions : suggestions,
          thought: streamThought,
          steps: streamSteps,
          isStreaming: true,
          isActionable: true
        };
      }));
    };

    const scheduleAssistantMessageFlush = (event?: string, chunk?: unknown) => {
      pendingAssistantEvent = event;
      pendingAssistantChunk = chunk;

      if (scheduledAssistantFrame !== null) return;
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        flushAssistantMessage();
        return;
      }

      scheduledAssistantFrame = window.requestAnimationFrame(() => {
        scheduledAssistantFrame = null;
        flushAssistantMessage();
      });
    };

    try {
      const chatMessages = [
        ...messagesRef.current
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
          taskKey: options?.taskKey,
          displayText: options?.displayContent,
          conversationId: conversationId || undefined,
        },
        (chunk, event) => {
          if (event === "thinking") {
            const rawText = String(chunk || "");
            const text = rawText.trim();
            if (!text) return;
            const displayText = translateThinkingStatus(stripThinkingLabel(text).trim());
            const displayRawText = stripThinkingLabel(rawText);
            if (!displayText) return;

            const lastStep = streamSteps[streamSteps.length - 1];
            const isStatusEvent = isStatusThinkingEvent(text);
            const isPreviousStatusEvent = lastStep?.type === "thinking" && isStatusThinkingEvent(lastStep.content);
            const shouldKeepSeparateThinkingEvent =
              isStatusEvent || isPreviousStatusEvent || isLabeledThinkingEvent(text);
            if (lastStreamEvent === "thinking" && lastStep?.type === "thinking" && !shouldKeepSeparateThinkingEvent) {
              streamSteps = [
                ...streamSteps.slice(0, -1),
                { ...lastStep, content: `${lastStep.content}${displayRawText}`, status: "active" },
              ];
            } else {
              streamSteps = [
                ...streamSteps.map((step) => ({ ...step, status: "complete" as const })),
                { type: "thinking", content: displayText, status: "active" },
              ];
            }
            streamThought = streamSteps.filter((step) => step.type === "thinking").map((step) => step.content).join("\n\n");
            lastStreamEvent = "thinking";
          } else if (event === "confidence") {
            const parsedConfidence = Number(String(chunk || "").trim());
            if (!Number.isNaN(parsedConfidence)) confidenceScore = parsedConfidence;
            completeStreamSteps();
            lastStreamEvent = "confidence";
          } else if (event === "sql") {
            sqlContent += String(chunk || "");
            completeStreamSteps();
            lastStreamEvent = "sql";
          } else if (event === "analysis") {
            analysisContent += String(chunk || "");
            completeStreamSteps();
            lastStreamEvent = "analysis";
          } else if (event === "citations") {
            citations = Array.isArray(chunk) ? chunk : [];
            completeStreamSteps();
            lastStreamEvent = "citations";
          } else if (event === "retrieval_trace") {
            retrievalTrace = chunk && typeof chunk === "object" ? chunk as Record<string, any> : undefined;
            completeStreamSteps();
            lastStreamEvent = "retrieval_trace";
          } else if (event === "warnings") {
            warnings = Array.isArray(chunk) ? chunk.map(String) : [];
            completeStreamSteps();
            lastStreamEvent = "warnings";
          } else if (event === "suggestions") {
            suggestionsContent += String(chunk || "");
            suggestions = parseSuggestionsContent(suggestionsContent);
            completeStreamSteps();
            lastStreamEvent = "suggestions";
          } else if (event !== "error") {
            responseContent += String(chunk || "");
            completeStreamSteps();
            lastStreamEvent = event || "message";
          }

          scheduleAssistantMessageFlush(event, chunk);
        },
        (headers) => {
          const cid = headers.get("X-Conversation-Id");
          if (cid && !conversationId) {
            setConversationId(cid);
            storeActiveConversationId(databaseId, cid);
            loadConversations(databaseId);
          }
        }
      );

    } catch (error: any) {
      toast.error(error.message || "Failed to generate SQL");
      flushAssistantMessage();
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}`, isStreaming: false } : m
      ));
    } finally {
      flushAssistantMessage();
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
