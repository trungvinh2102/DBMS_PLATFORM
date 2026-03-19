/**
 * @file BehaviorsAutomationCard.tsx
 * @description Card for configuring editor behaviors like word wrap and formatting.
 */

import { Settings2, AlignLeft, MousePointer2, Zap, FileCode } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BehaviorsAutomationCardProps {
  settings: any;
  updateEditor: (data: any) => void;
}

export function BehaviorsAutomationCard({ settings, updateEditor }: BehaviorsAutomationCardProps) {
  return (
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
  );
}
