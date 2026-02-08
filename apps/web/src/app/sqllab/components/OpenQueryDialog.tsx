import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, Calendar, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedQueries: any[];
  onSelect: (query: any) => void;
}

export function OpenQueryDialog({
  open,
  onOpenChange,
  savedQueries,
  onSelect,
}: OpenQueryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150 h-125 flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Saved Queries</DialogTitle>
          <DialogDescription>
            Select a query to load it into the editor.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="grid gap-2">
            {savedQueries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic text-sm">
                No saved queries found.
              </div>
            ) : (
              savedQueries.map((query) => (
                <div
                  key={query.id}
                  onClick={() => onSelect(query)}
                  className="group flex flex-col gap-1 p-3 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-bold group-hover:text-primary transition-colors">
                      {query.name}
                    </span>
                  </div>

                  {query.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 ml-6">
                      {query.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-1 ml-6 text-[10px] text-muted-foreground/60">
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      <span>
                        {query.database?.databaseName || "Unknown DB"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(query.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
