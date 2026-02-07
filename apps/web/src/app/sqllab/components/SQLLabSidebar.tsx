import React, { useState } from "react";
import {
  Search,
  Database,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Table2,
  Layers,
  CalendarClock,
  FunctionSquare,
  Settings2,
  Zap,
} from "lucide-react";
import {
  SiPostgresql,
  SiMysql,
  SiOracle,
  SiSqlite,
  SiMongodb,
  SiRedis,
} from "react-icons/si";
import { DiMsqlServer } from "react-icons/di";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DataSource } from "@/lib/types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SQLLabSidebarProps {
  dataSources: DataSource[];
  selectedDS: string;
  setSelectedDS: (id: string) => void;
  schemas: string[];
  selectedSchema: string;
  setSelectedSchema: (schema: string) => void;
  isLoadingTables: boolean;
  tables: string[] | undefined;
  views: string[] | undefined;
  functions: string[] | undefined;
  procedures: string[] | undefined;
  triggers: string[] | undefined;
  events: string[] | undefined;
  selectedTable: string | null;
  setSelectedTable: (table: string) => void;
  onRefreshTables: () => void;
}

export function SQLLabSidebar({
  dataSources,
  selectedDS,
  setSelectedDS,
  schemas,
  selectedSchema,
  setSelectedSchema,
  isLoadingTables,
  tables,
  views,
  functions,
  procedures,
  triggers,
  events,
  selectedTable,
  setSelectedTable,
  onRefreshTables,
}: SQLLabSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["tables"]);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedDSData = dataSources?.find((ds) => ds.id === selectedDS);

  const filterList = (list?: string[]) =>
    list?.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const filteredTables = filterList(tables);
  const filteredViews = filterList(views);
  const filteredFunctions = filterList(functions);
  const filteredProcedures = filterList(procedures);
  const filteredTriggers = filterList(triggers);
  const filteredEvents = filterList(events);

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folder)
        ? prev.filter((f) => f !== folder)
        : [...prev, folder],
    );
  };

  const getDBIcon = (type: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("postgres"))
      return <SiPostgresql className="h-5 w-5 text-blue-500" />;
    if (t.includes("mysql"))
      return <SiMysql className="h-5 w-5 text-orange-500" />;
    if (t.includes("sqlserver"))
      return <DiMsqlServer className="h-5 w-5 text-red-600" />;
    if (t.includes("oracle"))
      return <SiOracle className="h-5 w-5 text-red-500" />;
    if (t.includes("sqlite"))
      return <SiSqlite className="h-5 w-5 text-sky-500" />;
    if (t.includes("mongodb"))
      return <SiMongodb className="h-5 w-5 text-emerald-500" />;
    if (t.includes("redis"))
      return <SiRedis className="h-5 w-5 text-red-500" />;
    return <Database className="h-5 w-5" />;
  };

  const folderItem = (
    id: string,
    label: string,
    icon: React.ReactNode,
    items: string[] | undefined,
    count?: number,
    hasRefresh?: boolean,
  ) => {
    const isExpanded = expandedFolders.includes(id);
    return (
      <div className="flex flex-col">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group select-none",
            isExpanded ? "bg-muted/30" : "hover:bg-muted/20",
          )}
          onClick={() => toggleFolder(id)}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 opacity-40 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
          )}
          <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
            <div className="text-foreground/60 shrink-0">{icon}</div>
            <span className="text-xs font-semibold tracking-tight text-foreground/80 truncate">
              {label}
            </span>
            {count !== undefined && count > 0 && (
              <span className="text-[10px] opacity-30 font-mono ml-auto mr-1">
                {count}
              </span>
            )}
          </div>
          {hasRefresh && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefreshTables();
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3 opacity-40",
                  isLoadingTables && "animate-spin opacity-100",
                )}
              />
            </button>
          )}
        </div>
        {isExpanded && (
          <div className="flex flex-col border-l ml-4.5 mt-0.5 mb-1.5 pl-1.5 py-1 gap-px">
            {isLoadingTables && id === "tables" ? (
              <div className="px-3 py-2 space-y-2 opacity-20">
                <div className="h-2 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            ) : items && items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item}
                  className={cn(
                    "px-3 py-1.5 rounded cursor-pointer text-[11px] font-medium transition-all flex items-center gap-2 group/item",
                    // Only tables are selectable for now in main view logic, but we can allow selecting others if needed
                    // For now, only highlight if it matches selectedTable AND we are in the tables folder?
                    // Or just generic selection if we want to show details for other objects.
                    selectedTable === item && id === "tables"
                      ? "bg-primary/10 text-primary font-bold shadow-sm"
                      : "text-muted-foreground/80 hover:bg-muted/30 hover:text-foreground",
                  )}
                  onClick={() => {
                    // Allow selecting tables and views
                    if (id === "tables" || id === "views")
                      setSelectedTable(item);
                  }}
                >
                  {/* Reuse Table icon or passed icon? Passed icon is better but small size */}
                  <div
                    className={cn(
                      "h-3 w-3 shrink-0 transition-colors opacity-70",
                      selectedTable === item &&
                        (id === "tables" || id === "views")
                        ? "text-primary"
                        : "text-muted-foreground/40",
                    )}
                  >
                    {icon}
                  </div>
                  <span className="truncate">{item}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-[10px] italic opacity-30">
                {searchQuery
                  ? "No results match search"
                  : `No ${label.toLowerCase()} found`}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 flex flex-col border-r bg-background shrink-0 shadow-sm z-10 font-sans">
      {/* Connection Header */}
      <div className="p-3 pb-4 flex flex-col gap-3 border-b border-border/40">
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none w-full group">
            <div className="flex items-center gap-3 p-2 rounded-md transition-all hover:bg-muted/40 cursor-pointer w-full text-left">
              <div className="h-9 w-9 bg-muted/30 rounded flex items-center justify-center shrink-0 border border-border/40">
                {getDBIcon(selectedDSData?.type || "")}
              </div>
              <div className="flex flex-col items-start overflow-hidden flex-1 leading-tight">
                <span className="text-sm font-bold truncate w-full tracking-tight text-foreground/90">
                  {selectedDSData?.name || "Select Database"}
                </span>
                <span className="text-[10px] text-muted-foreground/60 truncate w-full font-medium">
                  {selectedDSData?.config?.host}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-68 ml-2 shadow-2xl rounded-lg border-muted-foreground/10 bg-background/95 backdrop-blur-md">
            {dataSources.map((ds) => (
              <DropdownMenuItem
                key={ds.id}
                onClick={() => setSelectedDS(ds.id)}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-md m-1",
                  selectedDS === ds.id
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted/50",
                )}
              >
                <div className="h-6 w-6 bg-muted/20 rounded-sm flex items-center justify-center border border-border/20 scale-75">
                  {getDBIcon(ds.type)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{ds.name}</span>
                  <span className="text-[9px] opacity-40">
                    {ds.config?.host || "localhost"}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Schema Selector */}
        <div className="w-full py-1">
          <Select
            value={selectedSchema}
            onValueChange={(val) => val && setSelectedSchema(val)}
          >
            <SelectTrigger className="w-full h-10 text-xs font-bold bg-muted/40 border border-border/40 hover:bg-muted/60 transition-all rounded-md px-4 gap-2.5 shadow-sm outline-none ring-0 focus:ring-1 focus:ring-primary/20">
              <div className="flex items-center gap-2 flex-1 truncate">
                <Database className="h-3.5 w-3.5 opacity-40 shrink-0" />
                <SelectValue placeholder="Select Schema" className="truncate" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-lg border-muted-foreground/10 shadow-2xl w-[--radix-select-trigger-width] min-w-64 p-1.5">
              {schemas.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-xs font-medium rounded-md cursor-pointer px-3 py-2.5"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Object Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 bg-muted/20 border-border/40 text-[11px] font-medium rounded-md focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin py-2">
        {folderItem(
          "tables",
          "Tables",
          <Table2 className="h-3.5 w-3.5" />,
          filteredTables,
          filteredTables?.length,
          true,
        )}
        {folderItem(
          "views",
          "Views",
          <Layers className="h-3.5 w-3.5" />,
          filteredViews,
          filteredViews?.length,
        )}
        {folderItem(
          "events",
          "Events",
          <CalendarClock className="h-3.5 w-3.5" />,
          filteredEvents,
          filteredEvents?.length,
        )}
        {folderItem(
          "functions",
          "Functions",
          <FunctionSquare className="h-3.5 w-3.5" />,
          filteredFunctions,
          filteredFunctions?.length,
        )}
        {folderItem(
          "procedures",
          "Procedures",
          <Settings2 className="h-3.5 w-3.5" />,
          filteredProcedures,
          filteredProcedures?.length,
        )}
        {folderItem(
          "triggers",
          "Triggers",
          <Zap className="h-3.5 w-3.5" />,
          filteredTriggers,
          filteredTriggers?.length,
        )}
      </div>
    </aside>
  );
}
