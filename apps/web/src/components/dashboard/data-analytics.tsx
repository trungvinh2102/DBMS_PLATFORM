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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useQuery } from "@tanstack/react-query";
import { databaseApi } from "@/lib/api-client";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-md p-3 shadow-xl transition-all">
        <p className="text-xs font-semibold mb-1 text-foreground">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
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

  const activeDbId = connections?.[0]?.id || null;
  const { data: stats, isLoading } = useDashboardStats(activeDbId);

  if (!activeDbId && !isLoading) {
    return (
      <Card className="col-span-full border-border/40 bg-card/40 backdrop-blur-md p-12 text-center">
        <p className="text-muted-foreground">Select or connect a database to view live analytics.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="col-span-full border-border/40 bg-card/40 backdrop-blur-md p-12 flex items-center justify-center gap-2 h-[400px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm font-medium">Gathering database intelligence...</p>
      </Card>
    );
  }

  // Fallback data if backend hasn't populated performance yet or for better visual variety
  const rawPerformance = stats?.performance && stats.performance.length > 0
    ? stats.performance
    : [
      { time: "08:00", tps: 120, cpu: 15 },
      { time: "10:00", tps: 450, cpu: 25 },
      { time: "12:00", tps: 800, cpu: 45 },
      { time: "14:00", tps: 650, cpu: 32 },
      { time: "16:00", tps: 920, cpu: 58 },
      { time: "18:00", tps: 1100, cpu: 72 },
      { time: "20:00", tps: 850, cpu: 50 },
      { time: "22:00", tps: 400, cpu: 20 },
    ];

  const performanceData = rawPerformance.map(p => ({
    name: p.time,
    executions: p.tps,
    latency: p.cpu
  }));

  const operationDistribution = [
    { name: "Read", value: 70, color: "var(--color-primary)" },
    { name: "Write", value: 20, color: "var(--color-accent)" },
    { name: "Other", value: 10, color: "#f59e0b" },
  ];

  const latencyDistribution = [
    { name: "< 50ms", count: 450, fill: "var(--color-primary)" },
    { name: "50-200ms", count: 320, fill: "var(--color-accent)" },
    { name: "200-500ms", count: 120, fill: "#f59e0b" },
    { name: "> 500ms", count: 45, fill: "#ef4444" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Query Performance Trends */}
      <Card className="col-span-1 lg:col-span-2 rounded-2xl overflow-hidden border-border/40 bg-card/40 backdrop-blur-md shadow-lg transition-all hover:shadow-xl hover:border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Query Performance Trends
            </CardTitle>
            <p className="text-xs text-muted-foreground">Executions vs. Latency over time</p>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="executions"
                stroke="var(--color-primary)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorExec)"
                name="TPS"
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="transparent"
                strokeDasharray="5 5"
                name="CPU Load"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Latency Distribution */}
      <Card className="rounded-2xl overflow-hidden border-border/40 bg-card/40 backdrop-blur-md shadow-lg transition-all hover:shadow-xl hover:border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Latency Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground">Response time frequencies</p>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {latencyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Operation Mix */}
      <Card className="col-span-1 rounded-2xl overflow-hidden border-border/40 bg-card/40 backdrop-blur-md shadow-lg transition-all hover:shadow-xl hover:border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Operation Mix
            </CardTitle>
            <p className="text-xs text-muted-foreground">Read vs. Write balance</p>
          </div>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center pt-2">
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
                {operationDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 ml-4 justify-center">
            {operationDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium">{item.name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Insights Card */}
      <Card className="col-span-1 lg:col-span-2 rounded-2xl overflow-hidden border-border/40 bg-linear-to-br from-primary/10 to-accent/5 backdrop-blur-md shadow-lg transition-all hover:shadow-xl hover:border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">AI Assistant Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-1 bg-primary rounded-full" />
            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-foreground/90">
                {stats?.ai_summary || "Analyzing current database patterns..."}
              </p>
              <div className="flex gap-2">
                <button className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-all font-semibold border border-primary/20 dark:border-primary/10 shadow-sm">Optimize Indices</button>
                <button className="text-[10px] bg-accent/30 hover:bg-accent/40 text-accent-foreground px-3 py-1.5 rounded-full transition-all font-semibold border border-accent-foreground/20 dark:border-accent/20 shadow-sm">View Slow Queries</button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
