/**
 * @file AccountSettings.tsx
 * @description Main account settings component that orchestrates profile and security sub-components.
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userApi, databaseApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

import { ProfileCard } from "./account-settings/ProfileCard";
import { PersonalIdentityForm } from "./account-settings/PersonalIdentityForm";
import { AccountSecurityForm } from "./account-settings/AccountSecurityForm";
import { CriticalActionsCard } from "./account-settings/CriticalActionsCard";

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

  // Sync local state when user prop changes
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
    !!avatarUrl && !avatarUrl.startsWith("data:"), 
    !!bio,
    !!user?.email
  ].filter(Boolean).length * 25;

  return (
    <div className="h-[calc(100vh-280px)] overflow-y-auto pr-6 custom-scrollbar scroll-smooth space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <ProfileCard 
          user={user}
          databases={databases}
          completeness={completeness}
          avatarUrl={avatarUrl}
          setAvatarUrl={setAvatarUrl}
          showAvatarDialog={showAvatarDialog}
          setShowAvatarDialog={setShowAvatarDialog}
          handleFileChange={handleFileChange}
          fileInputRef={fileInputRef}
        />

        <div className="lg:col-span-8 space-y-8">
          <PersonalIdentityForm 
            user={user}
            name={name}
            setName={setName}
            bio={bio}
            setBio={setBio}
            onUpdate={handleUpdateProfile}
            isPending={profileMutation.isPending}
          />

          <AccountSecurityForm 
            showPasswordDialog={showPasswordDialog}
            setShowPasswordDialog={setShowPasswordDialog}
            oldPassword={oldPassword}
            setOldPassword={setOldPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onUpdatePassword={handleChangePassword}
            isPasswordPending={passwordMutation.isPending}
          />

          <CriticalActionsCard />
        </div>
      </div>
    </div>
  );
}
