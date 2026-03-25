/**
 * @file DeleteModelDialog.tsx
 * @description Confirmation dialog for model de-registration.
 */

import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";

interface DeleteModelDialogProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  modelName: string;
}

export function DeleteModelDialog({ 
  isOpen, 
  setIsOpen, 
  onConfirm, 
  isDeleting,
  modelName
}: DeleteModelDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="glass border-rose-500/20 max-w-md p-0 overflow-hidden rounded-[2rem]">
        <div className="p-8 pb-4 flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-2">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-2xl font-black tracking-tighter">De-register Neural Node?</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold text-rose-500/70">Critical Operation Detected</DialogDescription>
          </div>
          
          <p className="text-sm text-muted-foreground font-medium px-4">
            You are about to disconnect <span className="text-foreground font-black underline decoration-rose-500/30 underline-offset-4">{modelName}</span> from the neural fabric. This will disable associated reasoning capabilities.
          </p>
        </div>
        
        <div className="flex items-center justify-center p-6 bg-muted/30 border-t border-border/40 gap-3">
          <Button variant="ghost" className="rounded-xl font-bold flex-1" onClick={() => setIsOpen(false)}>Abort</Button>
          <Button 
            className="rounded-xl flex-1 bg-rose-600 hover:bg-rose-700 font-bold shadow-lg shadow-rose-500/20" 
            onClick={onConfirm} 
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Confirm Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
