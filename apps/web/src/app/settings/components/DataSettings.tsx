/**
 * @file DataSettings.tsx
 * @description Enhanced Data display and export settings with premium UI and modern insights.
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
  ShieldCheck,
  Zap,
  Table as TableIcon,
  Globe,
  Binary,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider 
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DataSettings({ settings, updateData }: any) {
  // Sample data for preview
  const sampleNow = new Date();
  
  const getFormattedDate = (pattern: string) => {
    try {
      return format(sampleNow, pattern.replace("YYYY", "yyyy").replace("DD", "dd"));
    } catch {
      return "Invalid Format";
    }
  };

  return (
    <TooltipProvider delay={200}>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
          
          {/* Query Performance & Limits */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 shadow-sm border border-blue-500/20 group-hover/card:scale-110 transition-transform">
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
                <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-500 border-blue-500/20 font-bold uppercase tracking-tighter">
                  Optimization Level: High
                </Badge>
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
                      <Tooltip>
                        <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-blue-500" />} />
                        <TooltipContent>Prevents huge queries from hanging the UI by capping the result set.</TooltipContent>
                      </Tooltip>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Maximum number of rows to fetch in the SQL Lab by default.
                    </p>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 font-mono text-blue-500 bg-blue-500/5 border-blue-500/10 shadow-inner">
                    <Zap className="h-3 w-3 mr-1.5 inline animate-pulse" />
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
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">
                  <span>Fast (10)</span>
                  <span>Optimal (1k)</span>
                  <span>Bulk (5k)</span>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Other Performance Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-blue-500/30 transition-all hover:bg-blue-500/5 group">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500/70 group-hover:rotate-12 transition-transform" />
                      Hard Timeout (30s)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatic abort for queries exceeding threshold.
                    </p>
                  </div>
                  <Switch 
                    checked={settings.queryTimeout} 
                    onCheckedChange={(c: boolean) => updateData({ queryTimeout: !!c })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-green-500/30 transition-all hover:bg-green-500/5 group">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500/70 group-hover:scale-110 transition-transform" />
                      Auto-Explain
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generate execution plans for every query.
                    </p>
                  </div>
                  <Switch 
                    checked={settings.autoExplain} 
                    onCheckedChange={(c: boolean) => updateData({ autoExplain: !!c })} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result Display Formatting */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 shadow-sm border border-purple-500/20 group-hover/card:scale-110 transition-transform">
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
                    <Tooltip>
                      <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />} />
                      <TooltipContent>Text displayed when a database cell is NULL.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative group/input">
                    <Input
                      value={settings.showNullAs}
                      onChange={(e) => updateData({ showNullAs: e.target.value })}
                      placeholder="(null)"
                      className="pl-9 bg-muted/20 border-border/40 focus:bg-background h-10 transition-all focus:ring-1 focus:ring-purple-500/50"
                    />
                    <TableIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within/input:text-purple-500" />
                  </div>
                </div>

                {/* Date Format */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500/70" />
                    Timezone Format
                  </Label>
                  <Select
                    value={settings.dateTimeFormat}
                    onValueChange={(val: any) => updateData({ dateTimeFormat: val })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/40 focus:bg-background h-10 transition-all focus:ring-1 focus:ring-purple-500/50">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD HH:mm:ss">ISO (2024-03-19 14:30:15)</SelectItem>
                      <SelectItem value="DD/MM/YYYY HH:mm">Standard (19/03/2024 14:30)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">US Date Only (03/19/2024)</SelectItem>
                      <SelectItem value="MMM DD, YYYY">Descriptive (Mar 19, 2024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* LIVE PREVIEW AREA - WOW FACTOR 1 */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 shadow-inner overflow-hidden relative group/preview">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/10 blur-3xl group-hover/preview:bg-purple-500/20 transition-all duration-1000" />
                <Label className="text-[10px] uppercase tracking-widest text-purple-600/70 font-bold mb-3 block">
                  Live Action Preview
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-muted-foreground uppercase font-medium">Timestamp Example</span>
                    <div className="font-mono text-sm font-bold text-foreground/80 tracking-tight">
                      {getFormattedDate(settings.dateTimeFormat || "YYYY-MM-DD HH:mm:ss")}
                    </div>
                  </div>
                  <div className="space-y-1.5 border-l border-purple-500/10 pl-4">
                    <span className="text-[9px] text-muted-foreground uppercase font-medium">Null Indicator</span>
                    <div className="font-mono text-sm font-bold italic text-purple-600/80">
                      {settings.showNullAs || "(null)"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export & Governance */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 shadow-sm border border-emerald-500/20 group-hover/card:scale-110 transition-transform">
                  <Download className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Extract & Export
                  </CardTitle>
                  <CardDescription>
                    Configure advanced extraction formats and safety guardrails.
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
                    CSV & Raw Formats
                    <Tooltip>
                      <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground" />} />
                      <TooltipContent>The character used to separate fields in your exported files.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={settings.csvDelimiter}
                    onValueChange={(val: any) => val && updateData({ csvDelimiter: val })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/40 focus:bg-background h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Comma ( , )</SelectItem>
                      <SelectItem value=";">Semicolon ( ; )</SelectItem>
                      <SelectItem value="tab">Tab Character ( \t )</SelectItem>
                      <SelectItem value="|">Pipe ( | )</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Encoding - WOW FACTOR 2 (Advanced Export) */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-500/70" />
                    Result Encoding
                  </Label>
                  <Select
                    defaultValue="UTF-8"
                  >
                    <SelectTrigger className="bg-muted/20 border-border/40 focus:bg-background h-10 opacity-70">
                      <SelectValue placeholder="UTF-8" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTF-8">UTF-8 (International / Recommended)</SelectItem>
                      <SelectItem value="UTF-16">UTF-16 LE (Windows)</SelectItem>
                      <SelectItem value="ASCII">US-ASCII</SelectItem>
                      <SelectItem value="ISO">ISO-8859-1</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch checked={true} disabled className="scale-75 origin-left" />
                    <span className="text-[10px] text-muted-foreground">Include Byte Order Mark (BOM)</span>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Data Safety Card - WOW FACTOR 3 (Ethics & Governance) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 ring-4 ring-emerald-500/5">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground/90">Safety & Governance</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Mask PII (Sensitive Data) in query results automatically.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-500 font-bold tracking-widest bg-emerald-500/5">
                    SOON
                  </Badge>
                  <Switch checked={false} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
