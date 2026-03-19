/**
 * @file EditorPreviewBox.tsx
 * @description Real-time visual preview of editor settings with syntax-highlighted code.
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EditorPreviewBoxProps {
  settings: any;
}

export function EditorPreviewBox({ settings }: EditorPreviewBoxProps) {
  return (
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
            "bg-[#0d1117] text-[#c9d1d9]" 
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
  );
}
