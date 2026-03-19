/**
 * @file page.tsx
 * @description Settings page for managing user preferences and account details.
 */

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
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
import { userApi } from "@/lib/api-client";
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

// Lazy-loaded tab content components using standard React lazy
const GeneralSettings = lazy(() => import("./components/GeneralSettings").then((m) => ({ default: m.GeneralSettings })));
const EditorSettings = lazy(() => import("./components/EditorSettings").then((m) => ({ default: m.EditorSettings })));
const DataSettings = lazy(() => import("./components/DataSettings").then((m) => ({ default: m.DataSettings })));
const AccountSettings = lazy(() => import("./components/AccountSettings").then((m) => ({ default: m.AccountSettings })));

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "general";
  
  const { setTheme: setNextTheme } = useTheme();
  const store = useSettingsStore();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => userApi.getSettings(),
    enabled: !!user,
  });

  const dbSettings = settingsQuery.data as Partial<SettingsState> | null;
  const refetch = settingsQuery.refetch;

  const updateMutation = useMutation({
    mutationFn: (data: any) => userApi.updateSettings(data),
    onSuccess: () => toast.success("Settings saved successfully"),
    onError: (err: any) => toast.error(`Save failed: ${err.message}`),
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (dbSettings && !initialized.current) {
      const { updateEditor, updateData } = useSettingsStore.getState();
      updateEditor(dbSettings);
      updateData(dbSettings);
      if (dbSettings.theme) setNextTheme(dbSettings.theme);
      initialized.current = true;
    }
  }, [dbSettings, setNextTheme]);

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
      queryTimeout: store.queryTimeout,
      autoExplain: store.autoExplain,
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
            onClick={() => {
              store.resetDefaults();
              setNextTheme("system");
              toast.info("Reset to defaults");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Reset
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </header>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="space-y-4"
      >
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

        <Suspense fallback={<SettingsCardSkeleton />}>
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
        </Suspense>
      </Tabs>
    </div>
  );
}
