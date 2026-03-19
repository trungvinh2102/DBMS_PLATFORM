/**
 * @file ProfileCard.tsx
 * @description Profile overview card with avatar, completeness indicator, and platform insights.
 */

import React from "react";
import { UserCircle, Camera, Mail, Trophy, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { resolveUrl } from "@/lib/api-client";
import { AvatarDialog } from "./AvatarDialog";

interface ProfileCardProps {
  user: any;
  databases: any[] | undefined;
  completeness: number;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  showAvatarDialog: boolean;
  setShowAvatarDialog: (show: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

export function ProfileCard({
  user,
  databases,
  completeness,
  avatarUrl,
  setAvatarUrl,
  showAvatarDialog,
  setShowAvatarDialog,
  handleFileChange,
  fileInputRef,
}: ProfileCardProps) {
  return (
    <div className="lg:col-span-4 space-y-6">
      <Card className="border-none shadow-premium bg-gradient-to-b from-card to-muted/20 relative overflow-hidden group/card">
        <div className="absolute top-0 right-0 p-4 z-10">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm transition-all hover:scale-105">
            <div className={cn(
              "h-2 w-2 rounded-full",
              completeness === 100 ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-orange-500 animate-pulse"
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {completeness === 100 ? "Verified" : "Building"}
            </span>
          </div>
        </div>
        <CardContent className="pt-10 text-center">
          <div className="relative inline-block group mb-6">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={resolveUrl(avatarUrl)} 
                  alt="Avatar" 
                  className="h-36 w-36 rounded-2xl object-cover border-4 border-background shadow-2xl ring-1 ring-border/50 transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-36 w-36 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-4 border-background shadow-xl">
                  <UserCircle className="h-20 w-20 text-primary/60" />
                </div>
              )}
              
              <AvatarDialog 
                open={showAvatarDialog}
                onOpenChange={setShowAvatarDialog}
                avatarUrl={avatarUrl}
                setAvatarUrl={setAvatarUrl}
                onFileChange={handleFileChange}
                fileInputRef={fileInputRef}
              />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black tracking-tight text-foreground">{user?.name || "Member"}</h3>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-1 font-medium italic">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </p>
            <div className="mt-4 inline-flex items-center px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
              {user?.role || "Developer"}
            </div>
          </div>
        </CardContent>

        <Separator className="bg-border/30" />
        
        <CardContent className="pt-6 pb-8 px-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                   Profile Health
                </span>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Trophy className={cn("h-4 w-4", completeness === 100 ? "text-yellow-500" : "text-slate-400")} />
                  Level {Math.floor(completeness / 25)}
                </h4>
              </div>
              <span className="text-lg font-black text-foreground tabular-nums">{completeness}%</span>
            </div>
            <Progress 
              value={completeness} 
              className="h-3 bg-muted/40 shadow-inner" 
              indicatorClassName="bg-gradient-to-r from-orange-500 to-amber-400 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            />
            <p className="text-[10px] text-muted-foreground text-center">
              Complete your bio & avatar for full access.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border/40 overflow-visible shadow-premium">
        <CardHeader className="p-5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-blue-500" /> Platform Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active DBs</span>
            <span className="text-xs font-black text-foreground">{databases?.length || 0}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sessions</span>
            <span className="text-xs font-black text-foreground">1 Active</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
