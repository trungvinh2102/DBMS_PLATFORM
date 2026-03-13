"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { useTheme } from "next-themes";

interface NoSQLResultsProps {
  data: any[];
}

export function NoSQLResults({ data }: NoSQLResultsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { theme } = useTheme();

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(doc => {
      const str = JSON.stringify(doc).toLowerCase();
      return str.includes(term);
    });
  }, [data, searchTerm]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 italic text-sm">
        No documents found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-9 pr-8 bg-muted/50 border border-border rounded-md text-[11px] text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:bg-muted transition-all font-mono"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest whitespace-nowrap">
          {filteredData.length} of {data.length} docs
        </div>
      </div>
      <div className="flex-1 overflow-auto select-none p-4 custom-scrollbar">
        {filteredData.length > 0 ? (
          filteredData.map((doc, idx) => (
            <DocumentNode key={idx} data={doc} index={idx} isRoot searchTerm={searchTerm} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/20">
            <Search className="h-8 w-8 mb-4 opacity-10" />
            <p className="text-[10px] uppercase font-black tracking-widest">No matches found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentNode({ data, label, index, isRoot = false, searchTerm = "" }: { data: any, label?: string, index?: number, isRoot?: boolean, searchTerm?: string }) {
  const [isOpen, setIsOpen] = useState(isRoot && (index === 0 || !!searchTerm));
  const isObject = data !== null && typeof data === 'object';
  const type = Array.isArray(data) ? 'array' : typeof data;

  // Auto-expand if search term matches children
  React.useEffect(() => {
    if (searchTerm && isObject) {
      const str = JSON.stringify(data).toLowerCase();
      if (str.includes(searchTerm.toLowerCase())) {
        setIsOpen(true);
      }
    }
  }, [searchTerm, data, isObject]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Document copied to clipboard");
  };

  const renderValue = () => {
    if (data === null) return <span className="text-pink-600 dark:text-pink-500 font-mono italic">null</span>;
    if (type === 'string') return <span className="text-emerald-600 dark:text-emerald-400 font-mono">"{data}"</span>;
    if (type === 'number') return <span className="text-amber-600 dark:text-amber-400 font-mono">{data}</span>;
    if (type === 'boolean') return <span className="text-blue-600 dark:text-blue-400 font-mono">{data.toString()}</span>;
    return null;
  };

  return (
    <div className={cn(
      "flex flex-col",
      isRoot ? "mb-4 border border-border bg-muted/10 rounded-lg shadow-sm p-2" : "ml-4 border-l border-border"
    )}>
      <div 
        className={cn(
          "flex items-center py-1 px-2 rounded hover:bg-muted/50 transition-colors cursor-pointer group",
          isRoot && "bg-muted/30 mb-1"
        )}
        onClick={isObject ? toggle : undefined}
      >
        {isObject ? (
          isOpen ? <ChevronDown className="h-3 w-3 mr-1 text-muted-foreground/60" /> : <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground/60" />
        ) : (
          <div className="w-4" />
        )}
        
        {label && <span className="text-muted-foreground font-mono text-xs mr-2">{label}:</span>}
        
        {!isObject ? (
          <div className="flex-1 flex items-center justify-between">
            {renderValue()}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">
              {Array.isArray(data) ? `Array [${data.length}]` : `Object {${Object.keys(data).length}}`}
            </span>
            {isRoot && (
              <button 
                onClick={copyToClipboard}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all text-muted-foreground/60"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {isObject && isOpen && (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
          {Object.entries(data).map(([key, val], idx) => (
            <DocumentNode key={key} label={key} data={val} index={idx} searchTerm={searchTerm} />
          ))}
        </div>
      )}
    </div>
  );
}
