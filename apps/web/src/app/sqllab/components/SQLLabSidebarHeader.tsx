/**
 * @file SQLLabSidebarHeader.tsx
 * @description Header component for the SQL Lab sidebar, providing database selection, schema switching, and object searching.
 */

import React from "react";
import { Search, Database, ChevronsUpDown, Layers } from "lucide-react";
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
import { SidebarFolder } from "./sidebar/SidebarFolder";
import { getDBIcon, formatDBName } from "./sidebar/sidebar-utils";
import { useSQLLabContext } from "../context/SQLLabContext";

export function SQLLabSidebarHeader({
  searchQuery,
  setSearchQuery,
  getDBIcon: getDBIconProp,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getDBIcon: (type: string) => React.ReactNode;
}) {
  const lab = useSQLLabContext();
  const selectedDSData = lab.dataSources?.find((ds: DataSource) => ds.id === lab.selectedDS);
  const activeFormatted = formatDBName(selectedDSData);

  return (
    <div className="p-3 pb-4 flex flex-col gap-3 border-b border-border/40">
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none w-full group">
          <div className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-muted/40 cursor-pointer w-full text-left">
            <div className="h-9 w-9 bg-muted/30 rounded-lg flex items-center justify-center shrink-0 border border-border/40">
              {getDBIconProp(selectedDSData?.type || "")}
            </div>
            <div className="flex flex-col items-start overflow-hidden flex-1 leading-tight">
              <span className="text-sm font-bold truncate w-full tracking-tight text-foreground/90">
                {activeFormatted.title}
              </span>
              <span className="text-[10px] text-muted-foreground/60 truncate w-full font-medium font-mono uppercase tracking-tighter">
                {activeFormatted.subtitle}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          side="bottom" 
          align="start" 
          sideOffset={8}
          className="w-68 ml-2 shadow-2xl rounded-2xl border-muted-foreground/10 bg-background/95 backdrop-blur-md z-[100]"
        >
          {lab.dataSources.map((ds: any) => {
            const formatted = formatDBName(ds);
            return (
              <DropdownMenuItem
                key={ds.id}
                onClick={() => lab.setSelectedDS(ds.id)}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-xl m-1",
                  lab.selectedDS === ds.id
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted/50",
                )}
              >
                <div className="h-6 w-6 bg-muted/20 rounded-md flex items-center justify-center border border-border/20 scale-75 shrink-0">
                  {getDBIconProp(ds.type)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold truncate">{formatted.title}</span>
                  <span className="text-[9px] opacity-40 font-mono truncate uppercase">
                    {formatted.subtitle}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Schema/Database Selector */}
      <div className="w-full py-1 flex items-center gap-2">
        <Select
          value={lab.selectedSchema}
          onValueChange={(val) => val && lab.setSelectedSchema(val)}
        >
          <SelectTrigger className="w-full h-10 text-xs font-bold bg-muted/40 border border-border/40 hover:bg-muted/60 transition-all rounded-xl px-4 gap-2.5 shadow-sm outline-none ring-0 focus:ring-1 focus:ring-primary/20">
            <div className="flex items-center gap-2 flex-1 truncate">
              <Database className="h-3.5 w-3.5 opacity-40 shrink-0" />
              <SelectValue 
                placeholder={selectedDSData?.type?.toLowerCase() === "mongodb" ? "Select Database" : "Select Schema"} 
                className="truncate" 
              />
            </div>
          </SelectTrigger>
          <SelectContent 
            alignItemWithTrigger={false}
            side="bottom"
            align="start"
            sideOffset={8}
            className="rounded-2xl border-muted-foreground/10 shadow-2xl w-[--radix-select-trigger-width] min-w-64 p-1.5 z-[101]"
          >
            {lab.schemas.map((s: any) => (
              <SelectItem
                key={s}
                value={s}
                className="text-xs font-medium rounded-xl cursor-pointer px-3 py-2.5"
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
          placeholder={selectedDSData?.type?.toLowerCase() === "mongodb" ? "Search collections..." : "Search tables..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9 bg-muted/20 border-border/40 text-[11px] font-medium rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
        />
      </div>
    </div>
  );
}
