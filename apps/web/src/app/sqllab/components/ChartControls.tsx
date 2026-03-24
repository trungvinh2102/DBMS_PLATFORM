/**
 * @file ChartControls.tsx
 * @description UI controls for selecting chart types and configuring X/Y axes in the SQL Lab visualization panel.
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Layers,
  Check,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChartType = "bar" | "line" | "pie" | "area";

export function ChartTypeControls({
  chartType,
  setChartType,
}: {
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
}) {
  const types: { id: ChartType; icon: any; label: string }[] = [
    { id: "bar", icon: BarChart2, label: "Bar" },
    { id: "line", icon: LineChartIcon, label: "Line" },
    { id: "area", icon: AreaChartIcon, label: "Area" },
    { id: "pie", icon: PieChartIcon, label: "Pie" },
  ];

  return (
    <div className="flex items-center p-1 bg-muted/30 rounded-lg border backdrop-blur-sm">
      {types.map((t) => {
        const Icon = t.icon;
        const active = chartType === t.id;
        return (
          <Button
            key={t.id}
            variant="ghost"
            size="sm"
            onClick={() => setChartType(t.id)}
            className={cn(
              "h-8 px-3 gap-1.5 font-bold text-[10px] uppercase tracking-wider transition-all",
              active
                ? "bg-background shadow-sm text-primary hover:bg-background"
                : "text-muted-foreground/60 hover:text-muted-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5",
                active ? "text-primary" : "text-muted-foreground/40",
              )}
            />
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}

export function ChartAxisControls({
  columns,
  numericColumns,
  xAxisKey,
  setXAxisKey,
  yAxisKeys,
  setYAxisKeys,
  onDownload,
}: {
  columns: string[];
  numericColumns: string[];
  xAxisKey: string;
  setXAxisKey: (key: string) => void;
  yAxisKeys: string[];
  setYAxisKeys: (keys: string[]) => void;
  onDownload?: () => void;
}) {
  const toggleYAxis = (col: string) => {
    if (yAxisKeys.includes(col)) {
      if (yAxisKeys.length > 1) {
        setYAxisKeys(yAxisKeys.filter((k) => k !== col));
      }
    } else {
      setYAxisKeys([...yAxisKeys, col]);
    }
  };

  const selectableYColumns =
    numericColumns.length > 0 ? numericColumns : columns;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3 bg-muted/20 px-3 py-1.5 rounded-lg border backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-foreground/60 dark:text-foreground/70 uppercase tracking-[0.2em]">
            X-Axis
          </span>
          <Select
            value={xAxisKey}
            onValueChange={(val) => val && setXAxisKey(val)}
          >
            <SelectTrigger className="h-7 w-30 text-[10px] font-bold bg-background/50 border-none shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-background/80">
              {columns.map((col) => (
                <SelectItem
                  key={col}
                  value={col}
                  className="text-[10px] font-bold uppercase tracking-wider"
                >
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-foreground/60 dark:text-foreground/70 uppercase tracking-[0.2em]">
            Y-Axis
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center whitespace-nowrap rounded-md text-[10px] font-bold gap-1.5 h-7 px-2 hover:bg-background/50 text-foreground bg-transparent ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Layers className="h-3 w-3 text-primary/60" />
              <span className="truncate max-w-25">
                {yAxisKeys.length === 1
                  ? yAxisKeys[0]
                  : `${yAxisKeys.length} selected`}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 backdrop-blur-xl bg-background/80"
            >
              {selectableYColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={yAxisKeys.includes(col)}
                  onCheckedChange={() => toggleYAxis(col)}
                  className="text-[10px] font-bold uppercase tracking-wider"
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {onDownload && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors group"
          title="Download Chart"
        >
          <Download className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
        </Button>
      )}
    </div>
  );
}
