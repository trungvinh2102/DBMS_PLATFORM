import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api-client";
import { toast } from "sonner";

export interface ConnectionDefaults {
  timeout: number;
  keepAliveInterval: number;
  maxPoolSize: number;
}

export interface SecurityDefaults {
  enforceSSL: boolean;
  sslMode: "disable" | "prefer" | "require" | "verify-ca" | "verify-full";
}

export interface UserSettings {
  connectionDefaults?: ConnectionDefaults;
  securityDefaults?: SecurityDefaults;
  [key: string]: any;
}

export const useSettings = () => {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const data = await userApi.getSettings();
      // Ensure we always return an object, even if backend returns null
      return (data || {}) as UserSettings;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      // Get current settings to merge with
      const currentSettings = settingsQuery.data || {};
      const mergedSettings = { ...currentSettings, ...newSettings };
      return userApi.updateSettings(mergedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
};
