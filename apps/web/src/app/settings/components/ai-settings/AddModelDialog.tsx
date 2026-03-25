/**
 * @file AddModelDialog.tsx
 * @description Dialog component for registering new AI models.
 */

import { PlusCircle, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIModel, NewAIModel } from "./types";

interface AddModelDialogProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  newModel: NewAIModel;
  setNewModel: (val: NewAIModel) => void;
  onAdd: () => void;
  isAdding: boolean;
}

export function AddModelDialog({ 
  isOpen, 
  setIsOpen, 
  newModel, 
  setNewModel, 
  onAdd, 
  isAdding 
}: AddModelDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="rounded-2xl gap-2 font-bold tracking-tight bg-background/50 border-cyan-500/20 hover:bg-cyan-500/5 transition-all">
            <PlusCircle className="h-3.5 w-3.5 text-cyan-500" /> New Discovery
          </Button>
        }
      />
      <DialogContent className="glass border-border/50 max-w-lg p-0 overflow-hidden rounded-[2rem]">
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tighter">Register New Model</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold text-cyan-500/70">Inject custom capability into system</DialogDescription>
          </div>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alias Name</label>
                <Input 
                  placeholder="e.g. Gemini 1.5 Pro" 
                  className="rounded-2xl bg-muted/20 border-border/40 h-11"
                  value={newModel.name}
                  onChange={e => setNewModel({...newModel, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Engine ID</label>
                <Input 
                  placeholder="gemini-1.5-pro" 
                  className="rounded-2xl bg-muted/20 border-border/40 h-11 font-mono text-sm"
                  value={newModel.modelId}
                  onChange={e => setNewModel({...newModel, modelId: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Core Capability</label>
              <Input 
                placeholder="Describe model specialized reasoning..." 
                className="rounded-2xl bg-muted/20 border-border/40 h-11"
                value={newModel.description}
                onChange={e => setNewModel({...newModel, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Architecture</label>
              <Select value={newModel.provider} onValueChange={v => setNewModel({...newModel, provider: v || ""})}>
                <SelectTrigger className="rounded-2xl bg-muted/20 border-border/40 h-11 transition-all hover:bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="Google">Google Generative AI</SelectItem>
                  <SelectItem value="OpenAI" disabled>OpenAI Stack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end p-6 bg-muted/30 border-t border-border/40 gap-3">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setIsOpen(false)}>Abort</Button>
          <Button className="rounded-xl px-10 bg-cyan-600 hover:bg-cyan-700 font-bold shadow-lg shadow-cyan-500/20" onClick={onAdd} disabled={isAdding}>
            {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Register Model
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
