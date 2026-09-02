/**
 * @file SQLLabSidebar.tsx
 * @description Sidebar component for SQL Lab, providing schema navigation, database selection, and search.
 */

import React, { useState, useDeferredValue } from "react";
import {
  Table2,
  CalendarClock,
  FunctionSquare,
  Settings2,
  Zap,
  Eye,
  BadgeCheck,
  BriefcaseBusiness,
  GitBranch,
  HardDrive,
  KeyRound,
  Layers3,
  Link2,
  Package,
  Shield,
} from "lucide-react";
import { SQLLabSidebarHeader } from "./SQLLabSidebarHeader";
import { SidebarFolder } from "./sidebar/SidebarFolder";
import { getDBIcon } from "./sidebar/sidebar-utils";
import { useSQLLabContext } from "../context/SQLLabContext";
import { RedisKeyBrowser } from "./RedisKeyBrowser";

/**
 * The main sidebar for the SQL Lab. Handles schema browsing and database selection.
 */
export function SQLLabSidebar() {
  const lab = useSQLLabContext();
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["tables"]);
  const [searchQuery, setSearchQuery] = useState("");

  const deferredSearch = useDeferredValue(searchQuery);
  const isSearchStale = searchQuery !== deferredSearch;

  const filterList = (list?: string[]) =>
    list?.filter((item) =>
      item.toLowerCase().includes(deferredSearch.toLowerCase()),
    );

  const filteredTables = filterList(lab.tables);
  const filteredViews = filterList(lab.views);
  const filteredFunctions = filterList(lab.functions);
  const filteredProcedures = filterList(lab.procedures);
  const filteredTriggers = filterList(lab.triggers);
  const filteredEvents = filterList(lab.events);
  const filteredMaterializedViews = filterList(lab.materializedViews);
  const filteredSequences = filterList(lab.sequences);
  const filteredPartitions = filterList(lab.partitions);
  const filteredRoles = filterList(lab.roles);
  const filteredGrants = filterList(lab.grants);
  const filteredTablespaces = filterList(lab.tablespaces);
  const filteredExtensions = filterList(lab.extensions);
  const filteredSynonyms = filterList(lab.synonyms);
  const filteredJobs = filterList(lab.jobs);
  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folder)
        ? prev.filter((f) => f !== folder)
        : [...prev, folder],
    );
  };

  return (
    <aside className="flex shrink-0 border-r bg-background shadow-sm z-10 font-sans">
      <div className="flex w-72 min-w-0 flex-col">
        <SQLLabSidebarHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          getDBIcon={getDBIcon}
        />

        <div className="flex-1 overflow-auto scrollbar-thin py-2">
        {lab.selectedDSType === "redis" && (
          <RedisKeyBrowser
            keys={filteredTables || []}
            selectedKey={lab.selectedTable}
            isLoading={lab.isLoadingTables}
            onSelectKey={lab.setSelectedTable}
            onRefresh={lab.refetchTables}
            onApplyCommand={lab.setSql}
            onRunCommand={(command) => {
              lab.setSql(command);
              lab.handleRun(command);
            }}
          />
        )}

        <SidebarFolder
          id="tables"
          label={lab.selectedDSType === "mongodb" ? "Collections" : lab.selectedDSType === "redis" ? "Keys" : "Tables"}
          icon={<Table2 className={lab.selectedDSType === "redis" ? "h-4 w-4 text-red-500" : "h-4 w-4 text-blue-500"} />}
          items={filteredTables}
          count={filteredTables?.length}
          hasRefresh
          isExpanded={expandedFolders.includes("tables")}
          isLoading={lab.isLoadingTables}
          isRefreshing={lab.isFetchingTables}
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

        {/* Triggers: Supported by SQLite, PostgreSQL, MySQL, MSSQL - NOT by DuckDB, ClickHouse */}
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

        {/* Events/Functions/Procedures: Only for full RDBMS (PostgreSQL, MySQL, MSSQL) - NOT for SQLite, DuckDB, ClickHouse */}
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

        {lab.isRelational && (
          <>
            <SidebarFolder
              id="materialized-views"
              label="Materialized Views"
              icon={<Layers3 className="h-4 w-4 text-fuchsia-500" />}
              items={filteredMaterializedViews}
              count={filteredMaterializedViews?.length}
              isExpanded={expandedFolders.includes("materialized-views")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="sequences"
              label="Sequences"
              icon={<KeyRound className="h-4 w-4 text-cyan-600" />}
              items={filteredSequences}
              count={filteredSequences?.length}
              isExpanded={expandedFolders.includes("sequences")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="partitions"
              label="Partitions"
              icon={<GitBranch className="h-4 w-4 text-emerald-600" />}
              items={filteredPartitions}
              count={filteredPartitions?.length}
              isExpanded={expandedFolders.includes("partitions")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="roles"
              label="Roles"
              icon={<Shield className="h-4 w-4 text-red-500" />}
              items={filteredRoles}
              count={filteredRoles?.length}
              isExpanded={expandedFolders.includes("roles")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="grants"
              label="Grants"
              icon={<BadgeCheck className="h-4 w-4 text-lime-600" />}
              items={filteredGrants}
              count={filteredGrants?.length}
              isExpanded={expandedFolders.includes("grants")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="tablespaces"
              label="Tablespaces"
              icon={<HardDrive className="h-4 w-4 text-stone-600" />}
              items={filteredTablespaces}
              count={filteredTablespaces?.length}
              isExpanded={expandedFolders.includes("tablespaces")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="extensions"
              label="Extensions"
              icon={<Package className="h-4 w-4 text-teal-600" />}
              items={filteredExtensions}
              count={filteredExtensions?.length}
              isExpanded={expandedFolders.includes("extensions")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="synonyms"
              label="Synonyms"
              icon={<Link2 className="h-4 w-4 text-pink-500" />}
              items={filteredSynonyms}
              count={filteredSynonyms?.length}
              isExpanded={expandedFolders.includes("synonyms")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
            <SidebarFolder
              id="jobs"
              label="Jobs"
              icon={<BriefcaseBusiness className="h-4 w-4 text-amber-600" />}
              items={filteredJobs}
              count={filteredJobs?.length}
              isExpanded={expandedFolders.includes("jobs")}
              isLoading={lab.isLoadingTables}
              searchQuery={searchQuery}
              selectedItem={lab.selectedTable}
              onToggle={toggleFolder}
              onSelectItem={lab.setSelectedTable}
            />
          </>
        )}
            </div>
      </div>
    </aside>
  );
}
