/**
 * @file PersonalIdentityForm.tsx
 * @description Form for updating user's name and biology/biography.
 */

import { User as UserIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PersonalIdentityFormProps {
  user: any;
  name: string;
  setName: (name: string) => void;
  bio: string;
  setBio: (bio: string) => void;
  onUpdate: () => void;
  isPending: boolean;
}

export function PersonalIdentityForm({
  user,
  name,
  setName,
  bio,
  setBio,
  onUpdate,
  isPending,
}: PersonalIdentityFormProps) {
  return (
    <Card className="shadow-premium border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          Personal Identity
        </CardTitle>
        <CardDescription className="text-sm">
          Update your public profile information and biography.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2.5">
            <Label htmlFor="name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Name</Label>
            <Input 
              id="name" 
              placeholder="E.g. John Doe"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="bg-muted/10 border-border/40 h-11 focus:bg-background transition-all"
            />
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Account Email</Label>
            <Input 
              id="email" 
              value={user?.email || ""} 
              disabled 
              className="bg-muted/5 border-dashed border-border/30 h-11 opacity-50 select-none"
            />
          </div>
        </div>

        <div className="grid gap-2.5">
          <Label htmlFor="bio" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Biography</Label>
          <Textarea 
            id="bio" 
            placeholder="Tell the community about yourself, your technical stack and your goals..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bg-muted/10 border-border/40 min-h-[160px] p-4 text-sm leading-relaxed focus:bg-background transition-all"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={onUpdate}
            disabled={isPending}
            className="px-10 h-11 rounded-xl shadow-premium font-bold tracking-tight"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Publish Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
