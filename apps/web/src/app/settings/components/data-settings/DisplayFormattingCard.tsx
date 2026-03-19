/**
 * @file DisplayFormattingCard.tsx
 * @description Card for data formatting, null placeholding and real-time preview.
 */

import { Eye, Info, Calendar, Table as TableIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DisplayFormattingCardProps {
  settings: any;
  updateData: (data: any) => void;
  getFormattedDate: (pattern: string) => string;
}

export function DisplayFormattingCard({ 
  settings, 
  updateData, 
  getFormattedDate 
}: DisplayFormattingCardProps) {
  return (
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
  );
}
