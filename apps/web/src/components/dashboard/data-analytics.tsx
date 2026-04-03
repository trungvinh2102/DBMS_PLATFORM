/**
 * @file apps/web/src/components/dashboard/data-analytics.tsx
 * @description Provides a comprehensive data analysis dashboard with interactive charts using Recharts.
 */

"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { TrendingUp, Clock, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import { useDashboardStats, DashboardStatsPerformance } from "@/hooks/use-dashboard-stats";
import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";
import { DiagnosticsView } from "./diagnostics-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TooltipPayload {
  name: string;
  value: number | string;
  color?: string;
  fill?: string;
  payload: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-3 shadow-xl transition-all">
        <p className="text-xs font-semibold mb-1 text-foreground">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload.fill || entry.fill }} />
              <span className="text-[10px] text-muted-foreground mr-auto">{entry.name}:</span>
              <span className="text-[11px] font-bold text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DataAnalytics() {
  // Fetch connections to get a default DB if none selected
  const { data: connections } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
  });

  const activeDbId = (connections as any)?.[0]?.id || null;
  const activeDb = (connections as any)?.find((c: any) => c.id === activeDbId);
  const { data: stats, isLoading } = useDashboardStats(activeDbId);

  if (!activeDbId && !isLoading) {
    return (
      <div className="col-span-full glass-card p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <p className="text-muted-foreground font-medium">Select or connect a database to view live analytics.</p>
        <p className="text-xs text-muted-foreground mt-2 italic">Standard connections and local files supported.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="col-span-full glass-card p-12 flex items-center justify-center h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="space-y-1 text-center">
                <p className="text-sm font-semibold tracking-tight">Gathering database intelligence...</p>
                <p className="text-[10px] text-muted-foreground animate-pulse font-mono uppercase tracking-[0.2em]">Aggregating Analytical Models</p>
            </div>
        </div>
      </div>
    );
  }

  // Map performance data
  const rawPerformance: DashboardStatsPerformance[] = stats?.performance && stats.performance.length > 0
    ? stats.performance
    : [
      { time: "08:00", avg_latency: 120, total_queries: 15 },
      { time: "10:00", avg_latency: 450, total_queries: 25 },
      { time: "12:00", avg_latency: 800, total_queries: 45 },
      { time: "14:00", avg_latency: 650, total_queries: 32 },
    ];

  const performanceData = rawPerformance.map((p) => ({
    name: p.time,
    executions: p.total_queries,
    latency: Math.round(p.avg_latency || 0)
  }));

  // Status distribution
  const statusCounts = stats?.status_counts || [];
  const totalStatus = statusCounts.reduce((acc: number, curr: { count: number }) => acc + curr.count, 0);
  const operationDistribution = statusCounts.length > 0
    ? statusCounts.map((s: { status: string; count: number }) => ({
      name: s.status,
      value: Math.round((s.count / totalStatus) * 100),
      color: s.status === 'SUCCESS' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'
    }))
    : [
      { name: "SUCCESS", value: 100, color: "hsl(var(--primary))" },
    ];

  const latencyDistribution = [
    { name: "< 50ms", count: 450, fill: "hsl(var(--chart-1))" },
    { name: "50-200ms", count: 320, fill: "hsl(var(--chart-2))" },
    { name: "200-500ms", count: 120, fill: "hsl(var(--chart-3))" },
    { name: "> 500ms", count: 45, fill: "hsl(var(--destructive))" },
  ];

  return (
    <Tabs defaultValue="performance" className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <TabsList className="bg-muted/30 p-1 rounded-full border-none h-11">
          <TabsTrigger value="performance" className="rounded-full text-xs px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider transition-all">Performance</TabsTrigger>
          <TabsTrigger value="diagnostics" className="rounded-full text-xs px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider transition-all">Advanced Diagnostics</TabsTrigger>
        </TabsList>
        <div className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full border shadow-sm",
            "bg-primary/5 border-primary/20 text-primary"
        )}>
          {activeDb?.type?.toUpperCase() || "SQL"} Engine Active
        </div>
      </div>

      <TabsContent value="performance" className="mt-0 outline-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Query Performance Trends */}
          <div className="col-span-1 lg:col-span-2 bento-card">
            <div className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Performance Trends
                </h3>
                <p className="text-xs text-muted-foreground italic">DuckDB Analytics Engine</p>
              </div>
            </div>
            <div className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="executions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorExec)"
                    name="Volume (Queries)"
                  />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    fill="transparent"
                    strokeDasharray="5 5"
                    name="Avg Latency (ms)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latency Distribution */}
          <div className="bento-card">
            <div className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-chart-3" />
                  Latency Spectrum
                </h3>
                <p className="text-xs text-muted-foreground">Response time frequencies</p>
              </div>
            </div>
            <div className="h-[300px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary))', opacity: 0.05 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {latencyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Execution Integrity */}
          <div className="col-span-1 bento-card">
            <div className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Execution Integrity
                </h3>
                <p className="text-xs text-muted-foreground">Success vs. Failure</p>
              </div>
            </div>
            <div className="h-[200px] flex items-center pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operationDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {operationDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                {operationDistribution.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 pr-4">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold whitespace-nowrap">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analytical Summary */}
          <div className="col-span-1 lg:col-span-2 bento-card border-none bg-linear-to-br from-primary/10 to-accent-foreground/5 backdrop-blur-md">
            <div className="pb-4">
              <h3 className="text-lg font-semibold">Analytical Insights</h3>
            </div>
            <div className="flex gap-4">
              <div className="w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground/90 font-medium">
                  {stats?.ai_summary || "Applying DuckDB sub-second analytical models to interpret query behavior..."}
                </p>
                <div className="flex gap-2">
                  <button className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest border border-primary/20">Recalculate Baselines</button>
                  <button className="text-[10px] bg-white/5 hover:bg-white/10 text-muted-foreground px-4 py-2 rounded-full transition-all font-bold uppercase tracking-widest border border-border">Dump Analysis</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="diagnostics" className="mt-0 outline-hidden">
        <div className="glass-card p-8 animate-in fade-in slide-in-from-right-4 duration-500 min-h-[500px]">
          {activeDbId ? (
            <DiagnosticsView databaseId={activeDbId} table="auto" />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
              <TrendingUp className="h-16 w-16 mb-4" />
              <p className="text-sm font-bold uppercase tracking-tighter">No database connected for diagnostics</p>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}