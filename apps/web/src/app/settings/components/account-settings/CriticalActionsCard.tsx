/**
 * @file CriticalActionsCard.tsx
 * @description Card for high-risk account actions like deletion.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function CriticalActionsCard() {
  return (
    <Card className="border-red-500/20 bg-red-500/[0.03] shadow-premium overflow-hidden relative">
       <div className="absolute top-0 left-0 w-1 h-full bg-red-500/40" />
       <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
         <div className="text-center sm:text-left space-y-2">
           <h4 className="text-sm font-black text-red-600 dark:text-red-500 uppercase tracking-widest flex items-center gap-2">
             Critical Actions
           </h4>
           <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
             Permanent removal of your account, connections, and metadata. This action is **irreversible**.
           </p>
         </div>
         <Button 
            variant="destructive" 
            className="px-8 h-12 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            onClick={() => toast.error("System protected. Contact infrastructure administrator.")}
          >
            Terminate Account
          </Button>
       </CardContent>
    </Card>
  );
}
