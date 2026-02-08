/**
 * @file page.tsx
 * @description Settings page for managing user preferences and account details.
 *
 * @performance Implements lazy loading for tab content components:
 * - Only one tab is visible at a time, so lazy loading reduces initial bundle
 * - EditorSettings, DataSettings, AccountSettings load on-demand
 */

"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  Palette,
  Settings2,
  Database,
  User,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  useSettingsStore,
  type SettingsState,
} from "@/stores/use-settings-store";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Settings card skeleton for loading state
const SettingsCardSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-6 w-32 bg-muted rounded" />
    <div className="h-32 bg-muted rounded-lg" />
  </div>
);

// Lazy-loaded tab content components
const GeneralSettings = dynamic(
  () => import("./components/GeneralSettings").then((m) => m.GeneralSettings),
  { loading: () => <SettingsCardSkeleton /> },
);

const EditorSettings = dynamic(
  () => import("./components/EditorSettings").then((m) => m.EditorSettings),
  { loading: () => <SettingsCardSkeleton /> },
);

const DataSettings = dynamic(
  () => import("./components/DataSettings").then((m) => m.DataSettings),
  { loading: () => <SettingsCardSkeleton /> },
);

const AccountSettings = dynamic(
  () => import("./components/AccountSettings").then((m) => m.AccountSettings),
  { loading: () => <SettingsCardSkeleton /> },
);

export default function SettingsPage() {
  const { setTheme: setNextTheme } = useTheme();
  const store = useSettingsStore();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const settingsQuery = useQuery({
    ...trpc.user.getSettings.queryOptions(),
    enabled: !!user,
  });

  const dbSettings = settingsQuery.data as Partial<SettingsState> | null;
  const refetch = settingsQuery.refetch;

  const updateMutation = useMutation(
    trpc.user.updateSettings.mutationOptions({
      onSuccess: () => toast.success("Settings saved successfully"),
      onError: (err: any) => toast.error(`Save failed: ${err.message}`),
    }),
  );

  useEffect(() => {
    if (dbSettings) {
      store.updateEditor(dbSettings);
      store.updateData(dbSettings);
      if (dbSettings.theme) setNextTheme(dbSettings.theme);
    }
  }, [dbSettings]);

  useEffect(() => setMounted(true), []);

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      theme: store.theme,
      language: store.language,
      editorFontSize: store.editorFontSize,
      editorFontFamily: store.editorFontFamily,
      editorTabSize: store.editorTabSize,
      editorMinimap: store.editorMinimap,
      editorWordWrap: store.editorWordWrap,
      editorLineNumbers: store.editorLineNumbers,
      editorFormatOnPaste: store.editorFormatOnPaste,
      editorFormatOnSave: store.editorFormatOnSave,
      defaultQueryLimit: store.defaultQueryLimit,
      showNullAs: store.showNullAs,
      dateTimeFormat: store.dateTimeFormat,
      csvDelimiter: store.csvDelimiter,
    });
    refetch();
  };

  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!mounted) return null;

  return (
    <div className="container mx-auto py-10 px-4 md:px-8 max-w-6xl">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your interface, editor, data, and account.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => (
              store.resetDefaults(),
              setNextTheme("system"),
              toast.info("Reset to defaults")
            )}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </header>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-100">
          <TabsTrigger value="general">
            <Palette className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="editor">
            <Settings2 className="mr-2 h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="mr-2 h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="account">
            <User className="mr-2 h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings
            theme={store.theme}
            onThemeChange={(t) => {
              if (t) {
                store.setTheme(t as any);
                setNextTheme(t);
              }
            }}
          />
        </TabsContent>
        <TabsContent value="editor">
          <EditorSettings settings={store} updateEditor={store.updateEditor} />
        </TabsContent>
        <TabsContent value="data">
          <DataSettings settings={store} updateData={store.updateData} />
        </TabsContent>
        <TabsContent value="account">
          <AccountSettings user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
