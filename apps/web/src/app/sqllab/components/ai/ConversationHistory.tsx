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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  isLoading?: boolean;
}

export function ConversationHistory({ conversations, currentId, onSelect, onRefresh, isLoading }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handlePin = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      await aiApi.updateConversation(id, { isPinned: !currentStatus });
      onRefresh();
    } catch (err) {
      toast.error("Không thể ghim cuộc hội thoại");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await aiApi.deleteConversation(deleteId);
      onRefresh();
      setDeleteId(null);
      toast.success("Đã xóa cuộc hội thoại");
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
    <div className="flex flex-col gap-2 p-2">
      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-3 rounded-xl border border-border/20 bg-muted/20 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="h-3 w-[60%] bg-muted rounded-md" />
                  <div className="h-2 w-[30%] bg-muted/60 rounded-md" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <div className="h-5 w-5 bg-muted rounded-lg" />
                <div className="h-5 w-5 bg-muted rounded-lg" />
                <div className="h-5 w-5 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 text-center px-4">
          <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-[10px] uppercase tracking-widest font-bold">Chưa có lịch sử</p>
        </div>
      ) : null}

      {!isLoading && conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "group relative flex flex-col gap-1 p-3 rounded-xl border transition-all cursor-pointer",
            currentId === conv.id
              ? "bg-primary/10 border-primary/40 shadow-sm ring-1 ring-primary/20"
              : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-border/50"
          )}
        >
          {conv.isPinned && (
            <div className="absolute top-1 right-1 p-1 z-10">
              <Pin className="h-3 w-3 text-primary fill-primary/30" />
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
                  "text-[13px] font-black leading-tight truncate block",
                  currentId === conv.id ? "text-primary" : "text-foreground"
                )}>
                  {conv.title || "Untitled Conversation"}
                </span>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium uppercase tracking-tighter">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(new Date(conv.changed_on), { addSuffix: true, locale: vi })}
                </div>
              </div>
            )}
          </div>

          <div className={cn(
            "flex items-center justify-end gap-1.5 transition-all",
            editingId === conv.id ? "hidden" : "opacity-70 group-hover:opacity-100 mt-2"
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
              onClick={(e) => handleDeleteClick(e, conv.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md border-destructive/20 glass shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Xác nhận xóa
            </DialogTitle>
            <DialogDescription className="pt-2 text-foreground/70">
              Bạn có chắc chắn muốn xóa cuộc hội thoại này không? Toàn bộ tin nhắn trong cuộc hội thoại sẽ bị mất vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex-row gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteId(null)}
              className="h-9 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-muted/50 rounded-xl"
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="h-9 px-6 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-destructive/20 rounded-xl"
            >
              Xóa ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
