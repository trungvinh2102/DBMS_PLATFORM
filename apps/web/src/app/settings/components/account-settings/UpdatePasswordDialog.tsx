/**
 * @file UpdatePasswordDialog.tsx
 * @description Dialog for changing user password with validation.
 */

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface UpdatePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oldPassword: string;
  setOldPassword: (p: string) => void;
  newPassword: string;
  setNewPassword: (p: string) => void;
  confirmPassword: string;
  setConfirmPassword: (p: string) => void;
  onUpdate: () => void;
  isPending: boolean;
}

export function UpdatePasswordDialog({
  open,
  onOpenChange,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onUpdate,
  isPending,
}: UpdatePasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto px-6 h-11 rounded-xl font-bold" />}>
         Update Password
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Password</DialogTitle>
          <DialogDescription>
            Create a strong password with at least 8 characters.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Current Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={oldPassword} 
              onChange={(e) => setOldPassword(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">New Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Confirm New Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={onUpdate} 
            disabled={isPending}
            className="w-full"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Commit Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
