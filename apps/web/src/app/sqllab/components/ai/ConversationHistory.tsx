/**
 * @file ConversationHistory.tsx
 * @description Sidebar component for managing AI chat history, allowing users to view, pin, rename, or delete past conversations.
 */

import React, { useState, useEffect } from "react";
import { MessageSquare, Pin, Trash2, Edit2, Check, X, Clock, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface Conversation {
  id: string;
  title: string;
  isPinned: boolean;
  databaseId: string;
  created_on: string;
  changed_on: string;
}

interface Props {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export function ConversationHistory({ conversations, currentId, onSelect, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handlePin = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      await aiApi.updateConversation(id, { isPinned: !currentStatus });
      onRefresh();
    } catch (err) {
      toast.error("Không thể ghim cuộc hội thoại");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa cuộc hội thoại này?")) return;
    try {
      await aiApi.deleteConversation(id);
      onRefresh();
      if (currentId === id) {
        // Parent caller handles selection state
      }
    } catch (err) {
      toast.error("Không thể xóa cuộc hội thoại");
    }
  };

  const startEditing = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await aiApi.updateConversation(id, { title: editTitle });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      toast.error("Không thể đổi tên");
    }
  };

  // Group conversations by date
  // For simplicity, just render direct list since it's a small app
  
  return (
    <div className="flex flex-col gap-1 p-2 h-full overflow-y-auto scrollbar-none">
      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-center px-4">
          <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-[10px] uppercase tracking-widest font-bold">Chưa có lịch sử</p>
        </div>
      )}
      
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "group relative flex flex-col gap-1 p-3 rounded-xl border transition-all cursor-pointer overflow-hidden",
            currentId === conv.id 
              ? "bg-primary/10 border-primary/30 shadow-sm" 
              : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-border/50"
          )}
        >
          {conv.isPinned && (
            <div className="absolute top-0 right-0 p-1">
              <Pin className="h-3 w-3 text-primary fill-primary/20" />
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            {editingId === conv.id ? (
              <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-7 text-xs bg-background focus-visible:ring-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(conv.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => handleRename(conv.id)}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                <span className={cn(
                  "text-xs font-bold leading-tight truncate",
                  currentId === conv.id ? "text-primary" : "text-foreground/80"
                )}>
                  {conv.title}
                </span>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium uppercase tracking-tighter">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(new Date(conv.changed_on), { addSuffix: true, locale: vi })}
                </div>
              </div>
            )}
          </div>

          <div className={cn(
            "flex items-center justify-end gap-0.5 transition-opacity",
            editingId === conv.id ? "hidden" : "opacity-0 group-hover:opacity-100 mt-1"
          )}>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                onClick={(e) => handlePin(e, conv.id, conv.isPinned)}
            >
              {conv.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-amber-500 rounded-lg"
                onClick={(e) => startEditing(e, conv.id, conv.title)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                onClick={(e) => handleDelete(e, conv.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
