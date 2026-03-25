/**
 * @file ModelLibrary.tsx
 * @description AI Model library management sub-component.
 */

import { BrainCircuit, Cpu, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIModel } from "./types";
import { ReactNode } from "react";

interface ModelLibraryProps {
  models: AIModel[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  children?: ReactNode; // To pass the AddModelDialog
}

export function ModelLibrary({ 
  models, 
  isLoading, 
  onDelete,
  children
}: ModelLibraryProps) {
  return (
    <Card className="border-none shadow-premium overflow-hidden bg-card/50 backdrop-blur-sm group/card relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-blue-600 transition-all group-hover/card:w-1.5" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 shadow-sm border border-cyan-500/20 group-hover/card:scale-110 transition-transform">
              <Cpu className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Neural Model Library
              </CardTitle>
              <CardDescription>
                Manage and register cognitive models for SQL processing.
              </CardDescription>
            </div>
          </div>
          
          {children}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {isLoading ? (
             <div className="flex justify-center py-12">
               <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
             </div>
          ) : (
            models?.map((m) => (
              <div key={m.id} className="p-4 rounded-3xl bg-muted/20 border border-border/40 flex items-center justify-between group/model hover:bg-cyan-500/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-2xl bg-background border border-border/40 shadow-sm transition-transform group-hover/model:scale-110">
                    <BrainCircuit className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black tracking-tight underline decoration-cyan-500/30 underline-offset-4">{m.name}</div>
                      <code className="text-[9px] font-bold bg-background/80 px-1.5 py-0.5 rounded border border-border/50 text-cyan-600">{m.modelId}</code>
                      {m.isDefault && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded-full border border-cyan-500/20 leading-none">Default</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 font-medium max-w-[400px] line-clamp-1">{m.description || "Experimental neural node for SQL optimization."}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${m.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 opacity-50'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${m.isActive ? 'text-emerald-500' : 'text-rose-500 opacity-50'}`}>
                        {m.isActive ? 'Synchronized' : 'Offline'}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 uppercase font-black tracking-widest mt-1">Provider: {m.provider}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover/model:opacity-100"
                    onClick={() => onDelete(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          
          {(!isLoading && (!models || models.length === 0)) && (
             <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/5 border border-dashed border-border/60 rounded-3xl opacity-50">
                <BrainCircuit className="h-10 w-10 mb-3 opacity-20" />
                <span className="text-xs font-bold uppercase tracking-widest">No neural nodes detected</span>
             </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-3xl border-2 border-dashed border-border/30 bg-muted/5 flex items-center justify-center gap-4 text-xs text-muted-foreground opacity-70">
          <Info className="h-4 w-4 opacity-40" />
          <span>Advanced reasoning features are automatically distributed across active model clusters.</span>
        </div>
      </CardContent>
    </Card>
  );
}
