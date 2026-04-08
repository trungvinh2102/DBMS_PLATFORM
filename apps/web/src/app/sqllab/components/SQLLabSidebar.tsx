/**
 * @file SQLLabSidebar.tsx
 * @description Sidebar component for SQL Lab, providing schema navigation, database selection, and search.
 */

import React, { useState } from "react";
import {
  Table2,
  CalendarClock,
  FunctionSquare,
  Settings2,
  Zap,
  Eye,
} from "lucide-react";
import { SQLLabSidebarHeader } from "./SQLLabSidebarHeader";
import { SidebarFolder } from "./sidebar/SidebarFolder";
import { getDBIcon } from "./sidebar/sidebar-utils";
import { useSQLLabContext } from "../context/SQLLabContext";

/**
 * The main sidebar for the SQL Lab. Handles schema browsing and database selection.
 */
export function SQLLabSidebar() {
  const lab = useSQLLabContext();
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["tables"]);
  const [searchQuery, setSearchQuery] = useState("");

  const filterList = (list?: string[]) =>
    list?.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const filteredTables = filterList(lab.tables);
  const filteredViews = filterList(lab.views);
  const filteredFunctions = filterList(lab.functions);
  const filteredProcedures = filterList(lab.procedures);
  const filteredTriggers = filterList(lab.triggers);
  const filteredEvents = filterList(lab.events);

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folder)
        ? prev.filter((f) => f !== folder)
        : [...prev, folder],
    );
  };

  return (
    <aside className="w-72 flex flex-col border-r bg-background shrink-0 shadow-sm z-10 font-sans">
      <SQLLabSidebarHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        getDBIcon={getDBIcon}
      />

      <div className="flex-1 overflow-auto scrollbar-thin py-2">
        <SidebarFolder
          id="tables"
          label="Tables"
          icon={<Table2 className="h-4 w-4 text-blue-500" />}
          items={filteredTables}
          count={filteredTables?.length}
          hasRefresh
          isExpanded={expandedFolders.includes("tables")}
          isLoading={lab.isLoadingTables}
          searchQuery={searchQuery}
          selectedItem={lab.selectedTable}
          onToggle={toggleFolder}
          onRefresh={lab.refetchTables}
          onSelectItem={lab.setSelectedTable}
        />

        <SidebarFolder
          id="views"
          label="Views"
          icon={<Eye className="h-4 w-4 text-purple-500" />}
          items={filteredViews}
          count={filteredViews?.length}
          isExpanded={expandedFolders.includes("views")}
          isLoading={lab.isLoadingTables}
          searchQuery={searchQuery}
          selectedItem={lab.selectedTable}
          onToggle={toggleFolder}
          onSelectItem={lab.setSelectedTable}
        />

        {/* Triggers: Supported by SQLite, PostgreSQL, MySQL, MSSQL — NOT by DuckDB, ClickHouse */}
        {lab.isRelational && !["clickhouse", "duckdb"].includes(lab.selectedDSType) && (
            <SidebarFolder
              id="triggers"
              label="Triggers"
              icon={<Zap className="h-4 w-4 text-indigo-500" />}
              items={filteredTriggers}
              count={filteredTriggers?.length}
              isExpanded={expandedFolders.includes("triggers")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
        )}

        {/* Events/Functions/Procedures: Only for full RDBMS (PostgreSQL, MySQL, MSSQL) — NOT for SQLite, DuckDB, ClickHouse */}
        {lab.isRelational && !["clickhouse", "sqlite", "duckdb"].includes(lab.selectedDSType) && (
          <>
            <SidebarFolder
              id="events"
              label="Events"
              icon={<CalendarClock className="h-4 w-4 text-orange-500" />}
              items={filteredEvents}
              count={filteredEvents?.length}
              isExpanded={expandedFolders.includes("events")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="functions"
              label="Functions"
              icon={<FunctionSquare className="h-4 w-4 text-yellow-500" />}
              items={filteredFunctions}
              count={filteredFunctions?.length}
              isExpanded={expandedFolders.includes("functions")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="procedures"
              label="Procedures"
              icon={<Settings2 className="h-4 w-4 text-slate-500" />}
              items={filteredProcedures}
              count={filteredProcedures?.length}
              isExpanded={expandedFolders.includes("procedures")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
          </>
        )}
      </div>
    </aside>
  );
}
