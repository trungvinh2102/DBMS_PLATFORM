/**
 * @file RedisKeyBrowser.tsx
 * @description Redis key browser controls for SQL Lab sidebar.
 */

import { useMemo, useState } from "react";
import { Clock, DatabaseZap, Filter, Play, SearchCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildRedisReadCommand,
  buildRedisScanCommand,
  type RedisKeyType,
} from "../utils/nosql-builders";

const REDIS_TYPES: Array<{ value: RedisKeyType; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "string", label: "String" },
  { value: "hash", label: "Hash" },
  { value: "list", label: "List" },
  { value: "set", label: "Set" },
  { value: "zset", label: "ZSet" },
  { value: "stream", label: "Stream" },
];

type RedisKeyBrowserProps = {
  keys: string[];
  selectedKey: string | null;
  isLoading?: boolean;
  onSelectKey: (key: string) => void;
  onApplyCommand: (command: string) => void;
  onRunCommand: (command: string) => void;
  onRefresh: () => void;
};

export function RedisKeyBrowser({
  keys,
  selectedKey,
  isLoading = false,
  onSelectKey,
  onApplyCommand,
  onRunCommand,
  onRefresh,
}: RedisKeyBrowserProps) {
  const [pattern, setPattern] = useState("*");
  const [keyType, setKeyType] = useState<RedisKeyType>("auto");

  const filteredKeys = useMemo(() => {
    const query = pattern.trim().replace(/\*/g, "").toLowerCase();
    if (!query) return keys;
    return keys.filter((key) => key.toLowerCase().includes(query));
  }, [keys, pattern]);

  const applySelectedKey = (key: string, shouldRun = false) => {
    onSelectKey(key);
    const command = buildRedisReadCommand(key, keyType);
    if (shouldRun) onRunCommand(command);
    else onApplyCommand(command);
  };

  const scanCommand = buildRedisScanCommand(pattern, 100);

  return (
    <section className="border-b bg-muted/10 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <DatabaseZap className="h-4 w-4 text-red-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Key Browser
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 rounded-md"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh Redis keys"
        >
          <SearchCode className={cn("h-3.5 w-3.5", isLoading && "animate-pulse")} />
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_86px] gap-2">
        <div className="relative">
          <Filter className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="h-8 rounded-md pl-7 font-mono"
            spellCheck={false}
          />
        </div>
        <select
          value={keyType}
          onChange={(event) => setKeyType(event.target.value as RedisKeyType)}
          className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Redis key type"
        >
          {REDIS_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 rounded-md px-2 text-[10px]"
          onClick={() => onApplyCommand(scanCommand)}
        >
          SCAN
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-md px-2 text-[10px]"
          onClick={() => onRunCommand(scanCommand)}
        >
          <Play className="mr-1.5 h-3 w-3 text-red-500" />
          Run
        </Button>
        <span className="ml-auto text-[10px] font-bold text-muted-foreground/60">
          {filteredKeys.length}/{keys.length}
        </span>
      </div>

      {filteredKeys.length > 0 && (
        <div className="mt-3 max-h-56 overflow-auto rounded-md border bg-background">
          {filteredKeys.slice(0, 80).map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => applySelectedKey(key)}
              onDoubleClick={() => applySelectedKey(key, true)}
              className={cn(
                "flex h-8 w-full items-center gap-2 border-b px-2 text-left font-mono text-[11px] last:border-b-0 hover:bg-muted/60",
                selectedKey === key && "bg-red-500/10 text-red-700 dark:text-red-300",
              )}
            >
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="min-w-0 truncate">{key}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
