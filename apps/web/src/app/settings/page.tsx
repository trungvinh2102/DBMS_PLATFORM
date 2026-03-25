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
  Loader2,
  Sparkles,
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
const AISettings = lazy(() => import("./components/AISettings").then((m) => ({ default: m.AISettings })));

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
      const { updateEditor, updateData, updateGeneral } = useSettingsStore.getState();
      updateEditor(dbSettings);
      updateData(dbSettings);
      updateGeneral(dbSettings);
      if (dbSettings.theme) setNextTheme(dbSettings.theme);
      initialized.current = true;
    }
  }, [dbSettings, setNextTheme]);

  useEffect(() => setMounted(true), []);

  const handleSave = async () => {
    // Extract only the state values from the store, excluding functions
    const state = useSettingsStore.getState();
    const dataToSave = Object.keys(state).reduce((acc: any, key) => {
      if (typeof (state as any)[key] !== "function") {
        acc[key] = (state as any)[key];
      }
      return acc;
    }, {});

    await updateMutation.mutateAsync(dataToSave);
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

  const TABS = [
    { value: "general", label: "General", icon: Palette },
    { value: "editor", label: "Editor", icon: Settings2 },
    { value: "data", label: "Data", icon: Database },
    { value: "ai", label: "AI Assistant", icon: Sparkles },
    { value: "account", label: "Account", icon: User },
  ];

  return (
    <div className="container mx-auto py-4 px-2 md:px-2 max-w-6xl">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Settings</h2>
          <p className="text-muted-foreground font-medium mt-1">
            Tailor your workspace, AI intelligence, and personal profile.
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
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => setSearchParams({ tab: val })}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <TabsList className="flex h-14 items-center bg-card/30 backdrop-blur-md border border-border/40 p-1.5 rounded-[1.2rem] shadow-premium gap-1 w-fit">
            {TABS.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="flex items-center py-2.5 px-6 rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 hover:bg-muted/50 group whitespace-nowrap h-full"
              >
                <tab.icon className="mr-2.5 h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="font-bold tracking-tight text-sm">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        
        </div>

        <div className="w-full animate-in fade-in duration-500">
          <Suspense fallback={<SettingsCardSkeleton />}>
            <TabsContent value="general" className="mt-0 focus-visible:outline-none">
              <GeneralSettings
                theme={store.theme}
                settings={store}
                updateGeneral={store.updateGeneral}
                onThemeChange={(t) => {
                  if (t) {
                    store.setTheme(t as any);
                    setNextTheme(t);
                  }
                }}
              />
            </TabsContent>
            <TabsContent value="editor" className="mt-0 focus-visible:outline-none">
              <EditorSettings settings={store} updateEditor={store.updateEditor} />
            </TabsContent>
            <TabsContent value="data" className="mt-0 focus-visible:outline-none">
              <DataSettings settings={store} updateData={store.updateData} />
            </TabsContent>
            <TabsContent value="ai" className="mt-0 focus-visible:outline-none">
              <AISettings />
            </TabsContent>
            <TabsContent value="account" className="mt-0 focus-visible:outline-none">
              <AccountSettings user={user} />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}
