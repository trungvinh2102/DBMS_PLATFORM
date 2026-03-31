import React, { useState, useMemo, useRef, useCallback } from "react";
import * as Recharts from "recharts";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { ChartTypeControls, ChartAxisControls } from "./ChartControls";
import type { ChartType } from "./ChartControls";
import { suggestChartType } from "../utils/chart-suggestion";

interface ChartViewerProps {
  results: Record<string, unknown>[];
  columns: string[];
}

const COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

const GRADIENTS = [
  { start: "#3b82f6", end: "#60a5fa" },
  { start: "#8b5cf6", end: "#a78bfa" },
  { start: "#10b981", end: "#34d399" },
  { start: "#f59e0b", end: "#fbbf24" },
];

export function ChartViewer({ results, columns }: ChartViewerProps) {
  // Auto-suggest chart type based on data shape
  const suggestion = useMemo(
    () => suggestChartType(columns, results),
    [columns, results]
  );

  const [chartType, setChartType] = useState<ChartType>(suggestion.type);
  const [isAutoSuggested, setIsAutoSuggested] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);

  // Handle manual chart type change — dismiss AI badge
  const handleChartTypeChange = useCallback((type: ChartType) => {
    setChartType(type);
    setIsAutoSuggested(type === suggestion.type);
  }, [suggestion.type]);

  // Auto-detect numeric columns for Y axis and categorical for X axis
  const numericColumns = useMemo(() => {
    return columns.filter((col) => {
      for (let i = 0; i < Math.min(results.length, 5); i++) {
        const val = results[i][col];
        if (typeof val === "number") return true;
        if (typeof val === "string" && !isNaN(parseFloat(val))) return true;
      }
      return false;
    });
  }, [columns, results]);

  const categoricalColumns = useMemo(() => {
    return columns.filter((col) => !numericColumns.includes(col));
  }, [columns, numericColumns]);

  const defaultXAxis =
    categoricalColumns.length > 0 ? categoricalColumns[0] : columns[0];
  const defaultYAxis =
    numericColumns.length > 0
      ? [numericColumns[0]]
      : columns.length > 1
        ? [columns[1]]
        : [columns[0]];

  const [xAxisKey, setXAxisKey] = useState<string>(defaultXAxis);
  const [yAxisKeys, setYAxisKeys] = useState<string[]>(defaultYAxis);

  const chartData = useMemo(() => {
    return results
      .map((row) => {
        const newRow: Record<string, any> = {};
        columns.forEach((col) => {
          const val = row[col];
          if (yAxisKeys.includes(col)) {
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
  }, [results, columns, yAxisKeys]);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "hsl(var(--background))",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `sql-chart-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Chart exported as PNG");
    } catch (err) {
      console.error("Chart export failed", err);
      toast.error("Failed to export chart");
    }
  }, []);

  if (!results || results.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 backdrop-blur-xl border rounded-lg p-3 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 border-b pb-1.5 leading-none">
            {xAxisKey}: {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color || item.fill }}
                  />
                  <span className="text-[11px] font-bold text-foreground/80">
                    {item.name}
                  </span>
                </div>
                <span className="text-[11px] font-black text-primary font-mono tabular-nums">
                  {typeof item.value === "number"
                    ? item.value.toLocaleString()
                    : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-muted/5 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <ChartTypeControls chartType={chartType} setChartType={handleChartTypeChange} />
          {isAutoSuggested && suggestion.confidence !== "low" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-[9px]">✨</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">
                AI Suggested
              </span>
              <span className="text-[8px] text-primary/50 font-medium hidden sm:inline">
                — {suggestion.reason}
              </span>
            </div>
          )}
        </div>
        <ChartAxisControls
          columns={columns}
          numericColumns={numericColumns}
          xAxisKey={xAxisKey}
          setXAxisKey={setXAxisKey}
          yAxisKeys={yAxisKeys}
          setYAxisKeys={setYAxisKeys}
          onDownload={handleDownload}
        />
      </div>

      <div
        ref={chartRef}
        className="flex-1 min-h-0 p-6 relative group overflow-hidden"
      >
        {/* Abstract Background Element for Premium Feel */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 transition-all duration-1000 group-hover:bg-primary/10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] -ml-32 -mb-32 transition-all duration-1000 group-hover:bg-violet-500/10" />

        <div className="relative h-full w-full">
          {numericColumns.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg">
              <div className="p-3 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-xl flex items-center gap-3 animate-in slide-in-from-top duration-500">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <span className="text-[10px] font-black text-white">!</span>
                </div>
                <p className="text-[11px] font-bold text-amber-600/80">
                  No numeric columns detected. For best results, cast columns to
                  numbers in your SQL.
                </p>
              </div>
            </div>
          )}

          <Recharts.ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <Recharts.BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <defs>
                  {yAxisKeys.map((key: string, i: number) => (
                    <linearGradient
                      key={`grad-${key}`}
                      id={`grad-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="100%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0.3}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <Recharts.CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <Recharts.XAxis
                  dataKey={xAxisKey}
                  stroke="hsl(var(--foreground) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  className="font-bold uppercase tracking-wider"
                />
                <Recharts.YAxis
                  stroke="hsl(var(--foreground) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  className="font-mono"
                  tickFormatter={(val) =>
                    val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val
                  }
                />
                <Recharts.Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                />
                <Recharts.Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    paddingTop: "20px",
                  }}
                />
                {yAxisKeys.map((key: string, i: number) => (
                  <Recharts.Bar
                    key={key}
                    dataKey={key}
                    fill={`url(#grad-${key})`}
                    radius={[6, 6, 0, 0]}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    maxBarSize={45}
                  />
                ))}
              </Recharts.BarChart>
            ) : chartType === "line" ? (
              <Recharts.LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <Recharts.CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <Recharts.XAxis
                  dataKey={xAxisKey}
                  stroke="hsl(var(--foreground) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  className="font-bold uppercase tracking-wider"
                />
                <Recharts.YAxis
                  stroke="hsl(var(--foreground) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  className="font-mono"
                />
                <Recharts.Tooltip content={<CustomTooltip />} />
                <Recharts.Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    paddingTop: "20px",
                  }}
                />
                {yAxisKeys.map((key: string, i: number) => (
                  <Recharts.Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: "hsl(var(--background))",
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                ))}
              </Recharts.LineChart>
            ) : chartType === "area" ? (
              <Recharts.AreaChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <defs>
                  {yAxisKeys.map((key: string, i: number) => (
                    <linearGradient
                      key={`area-grad-${key}`}
                      id={`area-grad-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <Recharts.CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <Recharts.XAxis
                  dataKey={xAxisKey}
                  stroke="hsl(var(--foreground) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  className="font-bold uppercase tracking-wider"
                />
                <Recharts.YAxis
                  stroke="hsl(var(--foreground) / 0.6)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  className="font-mono"
                />
                <Recharts.Tooltip content={<CustomTooltip />} />
                <Recharts.Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    paddingTop: "20px",
                  }}
                />
                {yAxisKeys.map((key: string, i: number) => (
                  <Recharts.Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length]}
                    fillOpacity={1}
                    fill={`url(#area-grad-${key})`}
                    strokeWidth={3}
                    animationDuration={1500}
                  />
                ))}
              </Recharts.AreaChart>
            ) : (
              <Recharts.PieChart>
                <Recharts.Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey={yAxisKeys[0]}
                  nameKey={xAxisKey}
                  animationDuration={1500}
                >
                  {chartData.map((_: any, index: number) => (
                    <Recharts.Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Recharts.Pie>
                <Recharts.Tooltip content={<CustomTooltip />} />
                <Recharts.Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    paddingTop: "20px",
                  }}
                />
              </Recharts.PieChart>
            )}
          </Recharts.ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
