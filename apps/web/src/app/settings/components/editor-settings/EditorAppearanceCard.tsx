/**
 * @file EditorAppearanceCard.tsx
 * @description Card for configuring editor typography and visual layout.
 */

import { Type, TextCursorInput, Languages, Hash, Info, Grid3X3 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EditorAppearanceCardProps {
  settings: any;
  updateEditor: (data: any) => void;
}

export function EditorAppearanceCard({ settings, updateEditor }: EditorAppearanceCardProps) {
  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-red-600 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 shadow-sm border border-orange-500/20 group-hover/card:scale-110 transition-transform">
              <Type className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Editor Appearance
              </CardTitle>
              <CardDescription>
                Customize typography, sizing, and basic visual elements.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <TextCursorInput className="h-4 w-4 text-orange-500/70" />
                Font Size
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.editorFontSize}
                  onChange={(e) => updateEditor({ editorFontSize: parseInt(e.target.value) || 10 })}
                  className="w-16 h-7 text-[11px] font-bold text-center bg-orange-500/5 border-orange-500/10 focus:ring-1 focus:ring-orange-500/30 px-1"
                  min={10}
                  max={24}
                />
                <Badge variant="secondary" className="px-3 bg-orange-500/5 text-orange-600 border-orange-500/10 font-mono">
                  {settings.editorFontSize}px
                </Badge>
              </div>
            </div>
            <Slider
              value={[settings.editorFontSize]}
              min={10}
              max={24}
              step={1}
              onValueChange={(val) => {
                if (Array.isArray(val) && typeof val[0] === 'number') {
                  updateEditor({ editorFontSize: val[0] });
                }
              }}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
              <span>Compact</span>
              <span>Readable</span>
              <span>Large</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Languages className="h-4 w-4 text-orange-500/70" />
              Font Family
            </Label>
            <Input
              value={settings.editorFontFamily}
              onChange={(e) => updateEditor({ editorFontFamily: e.target.value })}
              placeholder="'JetBrains Mono', monospace"
              className="bg-muted/20 border-border/40 focus:bg-background h-10 transition-all focus:ring-1 focus:ring-orange-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex flex-col gap-3 group/item hover:bg-orange-500/5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-orange-500/70" />
                <span className="text-xs font-bold">Line Numbers</span>
              </div>
              <Tooltip>
                <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground" />} />
                <TooltipContent>Relative is great for Vim users.</TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={settings.editorLineNumbers}
              onValueChange={(val: any) => val && updateEditor({ editorLineNumbers: val })}
            >
              <SelectTrigger className="h-8 bg-background/50 border-none shadow-sm text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">On</SelectItem>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="relative">Relative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between group/item hover:bg-orange-500/5 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Grid3X3 className="h-4 w-4 text-orange-500/70" />
                Minimap
              </div>
              <p className="text-[10px] text-muted-foreground">Top-right overview.</p>
            </div>
            <Switch 
              checked={settings.editorMinimap} 
              onCheckedChange={(c) => updateEditor({ editorMinimap: !!c })} 
            />
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between group/item hover:bg-orange-500/5 transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold font-mono">
                {"=>"} Ligatures
              </div>
              <p className="text-[10px] text-muted-foreground">Enable modern programming font ligatures.</p>
            </div>
            <Switch 
              checked={settings.editorLigatures} 
              onCheckedChange={(c) => updateEditor({ editorLigatures: !!c })} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
