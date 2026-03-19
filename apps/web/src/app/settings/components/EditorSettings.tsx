/**
 * @file EditorSettings.tsx
 * @description Advanced Monaco editor configuration with premium UI and research-led insights.
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
  Type, 
  Settings2, 
  AlignLeft, 
  MousePointer2, 
  Zap, 
  FileCode, 
  Info,
  TextCursorInput,
  Hash,
  Grid3X3,
  Languages,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EditorSettings({ settings, updateEditor }: any) {
  // Sample code for preview
  const sampleSQL = `SELECT 
    e.employee_id, 
    e.first_name, 
    d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE e.salary > 50000;`;

  return (
    <TooltipProvider delay={200}>
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar pr-6">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
          
          {/* Section 1: Visual Appearance */}
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
                {/* Font Size Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <TextCursorInput className="h-4 w-4 text-orange-500/70" />
                      Font Size
                    </Label>
                    <Badge variant="secondary" className="px-3 bg-orange-500/5 text-orange-600 border-orange-500/10 font-mono">
                      {settings.editorFontSize}px
                    </Badge>
                  </div>
                  <Slider
                    value={[settings.editorFontSize]}
                    min={10}
                    max={24}
                    step={1}
                    onValueChange={(val: any) => updateEditor({ editorFontSize: Array.isArray(val) ? val[0] : val })}
                    className="py-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    <span>Compact</span>
                    <span>Readable</span>
                    <span>Large</span>
                  </div>
                </div>

                {/* Font Family */}
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
                  <p className="text-[10px] text-muted-foreground italic">
                    Requires font installation on your machine.
                  </p>
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
                    <p className="text-[10px] text-muted-foreground">Smart symbols.</p>
                  </div>
                  <Switch checked={false} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Editor Behaviors & Refinement */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-600 transition-all group-hover/card:w-1.5" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 shadow-sm border border-blue-500/20 group-hover/card:scale-110 transition-transform">
                  <Settings2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Behaviors & Automation
                  </CardTitle>
                  <CardDescription>
                    Boost your coding speed with automation and smart layouts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-blue-500/70" />
                    Word Wrap Strategy
                  </Label>
                  <Select
                    value={settings.editorWordWrap}
                    onValueChange={(val: any) => val && updateEditor({ editorWordWrap: val })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/40 h-10 transition-all focus:ring-1 focus:ring-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on">On</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="wordWrapColumn">Stick to Column</SelectItem>
                      <SelectItem value="bounded">Bounded Viewport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <MousePointer2 className="h-4 w-4 text-blue-500/70" />
                    Tab Indentation
                  </Label>
                  <Select
                    value={settings.editorTabSize.toString()}
                    onValueChange={(val: any) => val && updateEditor({ editorTabSize: parseInt(val) })}
                  >
                    <SelectTrigger className="bg-muted/20 border-border/40 h-10 transition-all focus:ring-1 focus:ring-blue-500/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Spaces (Modern)</SelectItem>
                      <SelectItem value="4">4 Spaces (Standard)</SelectItem>
                      <SelectItem value="8">8 Spaces (Wide)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 transition-all hover:bg-blue-500/5">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500/70" />
                      Format On Paste
                    </Label>
                    <p className="text-xs text-muted-foreground">Keep code neat during clipboard ops.</p>
                  </div>
                  <Switch 
                    checked={settings.editorFormatOnPaste} 
                    onCheckedChange={(c) => updateEditor({ editorFormatOnPaste: !!c })} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 transition-all hover:bg-blue-500/5">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-blue-500/70" />
                      Format On Save
                    </Label>
                    <p className="text-xs text-muted-foreground">Clean up every time you commit or save.</p>
                  </div>
                  <Switch 
                    checked={settings.editorFormatOnSave} 
                    onCheckedChange={(c) => updateEditor({ editorFormatOnSave: !!c })} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LIVE CODE PREVIEW - WOW FACTOR */}
          <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm border border-border/30">
            <div className="p-2 border-b border-border/30 bg-muted/30 flex items-center gap-2">
              <div className="flex gap-1.5 px-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 px-4">
                Real-Time Editor Preview (SQL Lab Environment)
              </span>
            </div>
            <CardContent className="p-0">
              <div 
                className={cn(
                  "p-8 font-mono relative overflow-hidden transition-all duration-300",
                  "bg-[#0d1117] text-[#c9d1d9]" // GitHub Dark theme mockup
                )}
                style={{
                  fontSize: `${settings.editorFontSize}px`,
                  fontFamily: settings.editorFontFamily || "'JetBrains Mono', monospace",
                  lineHeight: '1.6',
                }}
              >
                {/* Simulated Minimap */}
                {settings.editorMinimap && (
                  <div className="absolute top-4 right-4 w-12 h-24 bg-foreground/5 rounded opacity-50 border border-foreground/10 flex flex-col gap-0.5 p-1 animate-in fade-in zoom-in duration-500">
                    {Array.from({length: 20}).map((_, i) => (
                      <div key={i} className="h-0.5 bg-foreground/10 rounded-full w-full" style={{ width: `${Math.random() * 50 + 50}%` }} />
                    ))}
                  </div>
                )}

                {/* Code Body */}
                <div className="flex gap-6">
                  {/* Line Numbers */}
                  {settings.editorLineNumbers !== 'off' && (
                    <div className="text-muted-foreground/30 text-right select-none space-y-0.5 opacity-50 border-r border-border/10 pr-4">
                      {Array.from({length: 7}).map((_, i) => (
                        <div key={i}>{settings.editorLineNumbers === 'relative' ? (i === 3 ? 4 : Math.abs(3-i)) : i + 1}</div>
                      ))}
                    </div>
                  )}
                  {/* SQL Content with syntax colors */}
                  <div className="space-y-0.5 whitespace-pre">
                    <div><span className="text-[#ff7b72]">SELECT</span></div>
                    <div style={{ marginLeft: settings.editorTabSize * 8 }}>e.employee_id,</div>
                    <div style={{ marginLeft: settings.editorTabSize * 8 }}>e.first_name,</div>
                    <div style={{ marginLeft: settings.editorTabSize * 8 }}>d.department_name</div>
                    <div><span className="text-[#ff7b72]">FROM</span> employees e</div>
                    <div><span className="text-[#ff7b72]">JOIN</span> departments d <span className="text-[#ff7b72]">ON</span> e.dept_id = d.id</div>
                    <div><span className="text-[#ff7b72]">WHERE</span> e.salary {">"} <span className="text-[#a5d6ff]">50000</span>;</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
