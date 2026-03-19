/**
 * @file DataSettings.tsx
 * @description Enhanced Data display and export settings with premium UI.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  Calendar, 
  FileSpreadsheet, 
  Hash, 
  Eye, 
  Download,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function DataSettings({ settings, updateData }: any) {
  return (
    <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Query Performance & Limits */}
      <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 shadow-sm border border-blue-500/20">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Query Performance
              </CardTitle>
              <CardDescription>
                Configure how the engine handles data fetching and limits.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          {/* Default Limit Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-500/70" />
                  Default Query Limit
                </Label>
                <p className="text-xs text-muted-foreground">
                  Maximum number of rows to fetch in the SQL Lab by default.
                </p>
              </div>
              <Badge variant="secondary" className="px-3 py-1 font-mono text-blue-500 bg-blue-500/5 border-blue-500/10">
                {settings.defaultQueryLimit} rows
              </Badge>
            </div>
            <Slider
              value={[settings.defaultQueryLimit]}
              min={10}
              max={5000}
              step={10}
              onValueChange={(val: any) => updateData({ defaultQueryLimit: Array.isArray(val) ? val[0] : val })}
              className="py-4"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <span>Low (10)</span>
              <span>Fast (1k)</span>
              <span>Bulk (5k)</span>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Other Performance Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 group transition-all hover:bg-muted/50">
              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500/70" />
                  Query Timeout
                </Label>
                <p className="text-xs text-muted-foreground">
                  Abort long running queries after 30s.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 group transition-all hover:bg-muted/50">
              <div className="space-y-1">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500/70" />
                  Auto-explain
                </Label>
                <p className="text-xs text-muted-foreground">
                  Analyze performance for every query.
                </p>
              </div>
              <Switch checked={false} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Display Formatting */}
      <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-600" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 shadow-sm border border-purple-500/20">
              <Eye className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Display & Formatting
              </CardTitle>
              <CardDescription>
                Customize how raw data is presented in the results table.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Null Value Display */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500/50 rounded-full" />
                Null Value Placeholder
              </Label>
              <div className="relative group">
                <Input
                  value={settings.showNullAs}
                  onChange={(e) => updateData({ showNullAs: e.target.value })}
                  placeholder="(null)"
                  className="pl-9 bg-muted/30 border-border/50 focus:bg-background transition-all"
                />
                <Info className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                How <code className="px-1 py-0.5 rounded bg-muted">NULL</code> columns appear in the grid.
              </p>
            </div>

            {/* Date Format */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500/70" />
                Global Date Format
              </Label>
              <Select
                value={settings.dateTimeFormat}
                onValueChange={(val) => updateData({ dateTimeFormat: val })}
              >
                <SelectTrigger className="bg-muted/30 border-border/50 focus:bg-background transition-all">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD HH:mm:ss">Standard (2024-03-19 14:30:15)</SelectItem>
                  <SelectItem value="DD/MM/YYYY HH:mm">European (19/03/2024 14:30)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">Compact Date Only (03/19/2024)</SelectItem>
                  <SelectItem value="MMM DD, YYYY">Descriptive (Mar 19, 2024)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Override database timestamp display format.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export & Downloads */}
      <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-600" />
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 shadow-sm border border-emerald-500/20">
              <Download className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Export & Downloads
              </CardTitle>
              <CardDescription>
                Define settings for data extraction and external formats.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CSV Delimiter */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500/70" />
                CSV Delimiter
              </Label>
              <Select
                value={settings.csvDelimiter}
                onValueChange={(val) => val && updateData({ csvDelimiter: val })}
              >
                <SelectTrigger className="bg-muted/30 border-border/50 focus:bg-background transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Comma ( , )</SelectItem>
                  <SelectItem value=";">Semicolon ( ; )</SelectItem>
                  <SelectItem value="tab">Tab ( \t )</SelectItem>
                  <SelectItem value="|">Pipe ( | )</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Character used to separate columns in CSV files.
              </p>
            </div>

            {/* Max Download Rows */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-500/70" />
                Max Export Limit
              </Label>
              <div className="relative group">
                <Input
                  type="number"
                  defaultValue={50000}
                  disabled
                  className="pl-9 bg-muted/30 border-border/50 opacity-60 cursor-not-allowed"
                />
                <Database className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Limit for one-time exports to prevent timeouts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
