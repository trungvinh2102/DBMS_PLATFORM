/**
 * @file AccountSecurityForm.tsx
 * @description Card for managing account security, specifically passwords and 2FA.
 */

import { ShieldCheck, Fingerprint, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpdatePasswordDialog } from "./UpdatePasswordDialog";

interface AccountSecurityFormProps {
  showPasswordDialog: boolean;
  setShowPasswordDialog: (show: boolean) => void;
  oldPassword: string;
  setOldPassword: (p: string) => void;
  newPassword: string;
  setNewPassword: (p: string) => void;
  confirmPassword: string;
  setConfirmPassword: (p: string) => void;
  onUpdatePassword: () => void;
  isPasswordPending: boolean;
}

export function AccountSecurityForm({
  showPasswordDialog,
  setShowPasswordDialog,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onUpdatePassword,
  isPasswordPending,
}: AccountSecurityFormProps) {
  return (
    <Card className="shadow-premium border-none relative overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-green-500" />
          </div>
          Account Security
        </CardTitle>
        <CardDescription className="text-sm">
          Maintain your account security with strong authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl border border-border/60 bg-muted/5 gap-6 group hover:border-primary/20 transition-all">
          <div className="flex gap-4 items-center">
            <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center shadow-inner group-hover:bg-orange-500/20 transition-all">
              <Fingerprint className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold tracking-tight">Access Credentials</h4>
              <p className="text-xs text-muted-foreground">Modify your main login password.</p>
            </div>
          </div>
          <UpdatePasswordDialog 
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
            oldPassword={oldPassword}
            setOldPassword={setOldPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onUpdate={onUpdatePassword}
            isPending={isPasswordPending}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-2xl border border-dashed border-border/40 bg-muted/5 opacity-50 relative group">
          <div className="flex gap-4 items-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/5 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-blue-500/40" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold tracking-tight text-muted-foreground">Enhanced 2FA</h4>
              <p className="text-xs text-muted-foreground">Double account protection (Coming soon).</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" disabled className="w-full sm:w-auto font-bold">Inactive</Button>
        </div>
      </CardContent>
    </Card>
  );
}
