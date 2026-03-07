import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  BarChart2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChartViewerProps {
  results: Record<string, unknown>[];
  columns: string[];
}

const COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

type ChartType = "bar" | "line" | "pie" | "area";

export function ChartViewer({ results, columns }: ChartViewerProps) {
  console.log("results", results);
  console.log("columns", columns);
  const [chartType, setChartType] = useState<ChartType>("bar");

  // Auto-detect numeric columns for Y axis and categorical for X axis
  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      // Check first few rows to see if it's numeric
      for (let i = 0; i < Math.min(results.length, 5); i++) {
        const val = results[i][col];
        if (typeof val === "number") return true;
        // Also allow strings that can be parsed as valid numbers
        if (typeof val === "string" && !isNaN(parseFloat(val))) return true;
      }
      return false;
    });
  }, [columns, results]);

  const categoricalColumns = useMemo(() => {
    return columns.filter((col) => !numericColumns.includes(col));
  }, [columns, numericColumns]);

  // Default selections
  const defaultXAxis =
    categoricalColumns.length > 0 ? categoricalColumns[0] : columns[0];
  const defaultYAxis =
    numericColumns.length > 0
      ? numericColumns[0]
      : columns.length > 1
        ? columns[1]
        : columns[0];

  const [xAxisKey, setXAxisKey] = useState<string>(defaultXAxis);
  const [yAxisKey, setYAxisKey] = useState<string>(defaultYAxis);

  // Clean data for Recharts (convert string numbers to actual numbers, ensure labels are strings)
  const chartData = useMemo(() => {
    return results
      .map((row) => {
        const newRow: Record<string, any> = {};

        // Clean all columns to ensure they are the correct type for Recharts
        columns.forEach((col) => {
          const val = row[col];

          if (col === yAxisKey) {
            // Y-Axis values MUST be numeric
            if (typeof val === "number") {
              newRow[col] = val;
            } else if (typeof val === "string") {
              const parsed = parseFloat(val);
              newRow[col] = !isNaN(parsed) ? parsed : 0;
            } else if (val === null || typeof val === "boolean") {
              newRow[col] = val ? 1 : 0;
            } else {
              newRow[col] = 0;
            }
          } else {
            // All other values (especially X-Axis/Name-Axis) MUST be string-safe
            if (val === null || typeof val === "boolean") {
              newRow[col] = String(val);
            } else {
              newRow[col] = val;
            }
          }
        });

        return newRow;
      })
      .slice(0, 100);
  }, [results, columns, xAxisKey, yAxisKey]);

  if (!results || results.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-background p-4 gap-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("bar")}
            className="h-8 gap-1.5 font-bold text-xs"
          >
            <BarChart2 className="h-4 w-4" /> Bar
          </Button>
          <Button
            variant={chartType === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("line")}
            className="h-8 gap-1.5 font-bold text-xs"
          >
            <LineChartIcon className="h-4 w-4" /> Line
          </Button>
          <Button
            variant={chartType === "area" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("area")}
            className="h-8 gap-1.5 font-bold text-xs"
          >
            <AreaChartIcon className="h-4 w-4" /> Area
          </Button>
          <Button
            variant={chartType === "pie" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("pie")}
            className="h-8 gap-1.5 font-bold text-xs"
          >
            <PieChartIcon className="h-4 w-4" /> Pie
          </Button>
        </div>

        <div className="flex items-center gap-4 bg-muted/20 p-2 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              X-Axis
            </span>
            <Select
              value={xAxisKey}
              onValueChange={(val) => val && setXAxisKey(val)}
            >
              <SelectTrigger className="h-7 w-30 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col} className="text-xs">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Y-Axis
            </span>
            <Select
              value={yAxisKey}
              onValueChange={(val) => val && setYAxisKey(val)}
            >
              <SelectTrigger className="h-7 w-30 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.length > 0
                  ? numericColumns.map((col) => (
                      <SelectItem key={col} value={col} className="text-xs">
                        {col}
                      </SelectItem>
                    ))
                  : columns.map((col) => (
                      <SelectItem key={col} value={col} className="text-xs">
                        {col}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-muted/5 rounded-xl border p-4">
        {numericColumns.length === 0 && (
          <div className="mb-4 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md border border-amber-200 dark:border-amber-900">
            Note: No numeric columns detected. Charts may not render correctly.
            Try converting strings to numbers in your SQL query.
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any) => [value, String(yAxisKey)]}
                labelFormatter={(label: any) => `Category: ${String(label)}`}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
              <Bar
                dataKey={yAxisKey}
                name={String(yAxisKey)}
                fill={COLORS[0]}
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any) => [value, String(yAxisKey)]}
                labelFormatter={(label: any) => `Time/Label: ${String(label)}`}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
              <Line
                type="monotone"
                dataKey={yAxisKey}
                name={String(yAxisKey)}
                stroke={COLORS[0]}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                opacity={0.2}
                vertical={false}
              />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any) => [value, String(yAxisKey)]}
                labelFormatter={(label: any) => `Area: ${String(label)}`}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
              <Area
                type="monotone"
                dataKey={yAxisKey}
                name={String(yAxisKey)}
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.3}
                strokeWidth={2}
                animationDuration={1000}
              />
            </AreaChart>
          ) : (
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any, name: any) => [value, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Pie
                data={chartData}
                dataKey={yAxisKey}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                label={{ fontSize: 11 }}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
