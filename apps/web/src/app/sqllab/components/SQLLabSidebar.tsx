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
  Eye,
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
import { SQLLabSidebarHeader } from "./SQLLabSidebarHeader";

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
  isRelational: boolean;
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
  isRelational,
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
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleFolder(id);
            }
          }}
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedTable(item);
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded cursor-pointer text-[11px] font-medium transition-all flex items-center gap-2 group/item",
                    // Only tables are selectable for now in main view logic, but we can allow selecting others if needed
                    // For now, only highlight if it matches selectedTable AND we are in the tables folder?
                    // Or just generic selection if we want to show details for other objects.
                    selectedTable === item
                      ? "bg-primary/10 text-primary font-bold shadow-sm"
                      : "text-muted-foreground/80 hover:bg-muted/30 hover:text-foreground",
                  )}
                  onClick={() => {
                    setSelectedTable(item);
                  }}
                >
                  <div
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-all",
                      selectedTable === item
                        ? "opacity-100 scale-110 drop-shadow-sm"
                        : "opacity-70 grayscale-30",
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
      <SQLLabSidebarHeader
        dataSources={dataSources}
        selectedDS={selectedDS}
        setSelectedDS={setSelectedDS}
        selectedDSData={selectedDSData}
        schemas={schemas}
        selectedSchema={selectedSchema}
        setSelectedSchema={setSelectedSchema}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        getDBIcon={getDBIcon}
      />

      <div className="flex-1 overflow-auto scrollbar-thin py-2">
        {folderItem(
          "tables",
          "Tables",
          <Table2 className="h-4 w-4 text-blue-500" />,
          filteredTables,
          filteredTables?.length,
          true,
        )}
        {folderItem(
          "views",
          "Views",
          <Eye className="h-4 w-4 text-purple-500" />,
          filteredViews,
          filteredViews?.length,
        )}
        {isRelational &&
          folderItem(
            "events",
            "Events",
            <CalendarClock className="h-4 w-4 text-orange-500" />,
            filteredEvents,
            filteredEvents?.length,
          )}
        {isRelational &&
          folderItem(
            "functions",
            "Functions",
            <FunctionSquare className="h-4 w-4 text-yellow-500" />,
            filteredFunctions,
            filteredFunctions?.length,
          )}
        {isRelational &&
          folderItem(
            "procedures",
            "Procedures",
            <Settings2 className="h-4 w-4 text-slate-500" />,
            filteredProcedures,
            filteredProcedures?.length,
          )}
        {isRelational &&
          folderItem(
            "triggers",
            "Triggers",
            <Zap className="h-4 w-4 text-indigo-500" />,
            filteredTriggers,
            filteredTriggers?.length,
          )}
      </div>
    </aside>
  );
}
