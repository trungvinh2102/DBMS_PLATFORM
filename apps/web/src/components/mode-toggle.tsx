"use client";

import { Moon, Sun, Check } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useSettingsStore } from "@/stores/use-settings-store";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current settings to merge updates
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => userApi.getSettings(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => userApi.updateSettings(data),
    onSuccess: () => {
      // Invalidate settings query to update other components
      queryClient.invalidateQueries({
        queryKey: ["settings"],
      });
    },
    onError: (err: any) => {
      console.error("Failed to sync theme preference", err);
    },
  });

  const store = useSettingsStore();

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    // Sync local store so UI components (like settings page) update immediately
    store.setTheme(newTheme as any);

    // Only sync if user is logged in and we have loaded current settings
    // (to avoid overwriting other settings with a partial update)
    if (user && settings !== undefined) {
      // Merge with existing settings
      const newSettings = { ...(settings || {}), theme: newTheme as any };
      updateMutation.mutate(newSettings);
    }
  };

  const THEMES = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-1.5 focus:outline-none min-w-[120px]">
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => handleSetTheme(t.value)}
            className={cn(
              "px-3 py-2 cursor-pointer transition-colors flex items-center justify-between gap-2",
              theme === t.value && "bg-muted font-semibold"
            )}
          >
            {t.label}
            {theme === t.value && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
