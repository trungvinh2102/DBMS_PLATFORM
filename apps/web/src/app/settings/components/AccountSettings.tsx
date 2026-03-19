import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userApi, databaseApi, resolveUrl } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Camera, 
  Lock, 
  ShieldCheck, 
  Database, 
  Trophy, 
  Mail, 
  User as UserIcon,
  ShieldAlert,
  Fingerprint,
  Link as LinkIcon,
  Upload,
  UserCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AccountSettings({ user }: any) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: databases } = useQuery({
    queryKey: ["databases"],
    queryFn: () => databaseApi.list(),
    staleTime: 60000,
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => userApi.updateProfile(data),
    onSuccess: (updatedUser: any) => {
      toast.success("Profile updated successfully");
      setUser({ ...user, ...updatedUser });
    },
    onError: (err: any) => toast.error(`Update failed: ${err.message}`),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: any) => userApi.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowPasswordDialog(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => toast.error(`Failed to change password: ${err.message}`),
  });

  // Sync local state when user prop changes (e.g. after a successful update)
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatarUrl(user.avatarUrl || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const handleUpdateProfile = () => {
    profileMutation.mutate({ name, avatarUrl, bio });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarUrl(base64String);
        
        // Immediate upload for better UX and header sync
        profileMutation.mutate({ avatarUrl: base64String });
        toast.info("Uploading avatar...");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    passwordMutation.mutate({ oldPassword, newPassword });
  };

  // Calculate profile completeness
  const completeness = [
    !!name,
    !!avatarUrl && !avatarUrl.startsWith("data:"), // only count non-temporary URLs
    !!bio,
    !!user?.email
  ].filter(Boolean).length * 25;

  return (
    <div className="h-[calc(100vh-280px)] overflow-y-auto pr-6 custom-scrollbar scroll-smooth space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile Card */}
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
                  
                  <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                    <DialogTrigger render={
                      <Button 
                        size="icon" 
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl shadow-xl border-2 border-background transition-all duration-300 hover:scale-110 active:scale-95 opacity-100 z-20"
                      />
                    }>
                      <Camera className="h-5 w-5" />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Update Avatar</DialogTitle>
                        <DialogDescription>
                          Upload a professional photo or link to an image.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-6 py-4">
                        <div className="h-32 w-32 rounded-2xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                          {avatarUrl ? (
                            <img src={avatarUrl} className="h-full w-full object-cover" />
                          ) : (
                            <Camera className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="grid w-full gap-4">
                          <div className="flex gap-2">
                             <Input 
                               placeholder="Image URL..." 
                               value={avatarUrl}
                               onChange={(e) => setAvatarUrl(e.target.value)}
                               className="flex-1"
                             />
                             <Button size="icon" variant="outline"><LinkIcon className="h-4 w-4" /></Button>
                          </div>
                          <Separator />
                          <input 
                            type="file" 
                            hidden 
                            ref={fileInputRef} 
                            accept="image/*" 
                            onChange={handleFileChange}
                          />
                          <Button 
                            variant="secondary" 
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" /> Upload local file
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="w-full" onClick={() => setShowAvatarDialog(false)}>
                          Done
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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

        {/* Right Column: Settings Form */}
        <div className="lg:col-span-8 space-y-8">
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
                  onClick={handleUpdateProfile}
                  disabled={profileMutation.isPending}
                  className="px-10 h-11 rounded-xl shadow-premium font-bold tracking-tight"
                >
                  {profileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Publish Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>

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
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
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
                        onClick={handleChangePassword} 
                        disabled={passwordMutation.isPending}
                        className="w-full"
                      >
                        {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Commit Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
        </div>
      </div>
    </div>
  );
}


