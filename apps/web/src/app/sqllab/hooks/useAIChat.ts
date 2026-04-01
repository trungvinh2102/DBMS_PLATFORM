/**
 * @file useAIChat.ts
 * @description Custom hook for managing AI chat state, streaming responses, and parsing content.
 */

import { useState, useCallback } from "react";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Message } from "../components/ai/AIMessage";

export function useAIChat(databaseId?: string, schema?: string, selectedModel?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
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

    // Extract Thinking Section
    const thoughtMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thoughtMatch) {
      thought = thoughtMatch[1].trim();
      content = content.replace(thoughtMatch[0], "").trim();
    } else {
      const partialThought = text.match(/<thinking>([\s\S]*)/);
      if (partialThought) {
        thought = partialThought[1].trim();
        content = "";
      }
    }

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

    return { content, thought, sql, analysis };
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
    }
  };

  const loadConversations = useCallback(async (dbId?: string) => {
    try {
      const list = await aiApi.getConversations(dbId);
      setConversations(list);
    } catch (e) {
      console.error("Failed to load conversation list", e);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsTyping(true);
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
      setIsTyping(false);
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
      content: "Brainstorming SQL strategy...",
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
        (chunk) => {
          fullContent += chunk;
          
          // Parse the accumulating content to update specific fields (thinking, sql, etc.)
          const parsed = parseMessageContent({ role: "assistant", content: fullContent });
          
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? {
              ...m,
              ...parsed,
              isActionable: true
            } : m
          ));
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
