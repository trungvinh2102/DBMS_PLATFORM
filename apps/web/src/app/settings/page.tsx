"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Palette,
  Settings2,
  Database,
  User,
  Save,
  RotateCcw,
  Check,
} from "lucide-react";
import { useSettingsStore } from "@/stores/use-settings-store"; // Ensure this path is correct
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme();

  // Connect to our store
  const {
    updateEditor,
    updateData,
    resetDefaults,
    theme: storeTheme,
    language: storeLanguage,
    editorFontSize,
    editorFontFamily,
    editorTabSize,
    editorMinimap,
    editorWordWrap,
    editorLineNumbers,
    editorFormatOnPaste,
    editorFormatOnSave,
    defaultQueryLimit,
    showNullAs,
    dateTimeFormat,
    csvDelimiter,
    setTheme,
  } = useSettingsStore();

  const { user } = useAuth();

  // TRPC Hooks
  const { data: dbSettings, refetch } = useQuery({
    ...trpc.user.getSettings.queryOptions(),
    enabled: !!user,
  });

  const updateSettingsMutation = useMutation(
    trpc.user.updateSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Settings saved to cloud");
      },
      onError: (error: any) => {
        toast.error(`Failed to save: ${error.message}`);
      },
    }),
  );

  const [mounted, setMounted] = useState(false);

  // Load from DB on mount/change
  useEffect(() => {
    if (dbSettings) {
      // Merge DB settings into store
      updateEditor(dbSettings);
      updateData(dbSettings);
      if (dbSettings.theme) {
        setNextTheme(dbSettings.theme);
      }
    }
  }, [dbSettings, updateEditor, updateData, setNextTheme]);

  // Sync with next-themes on mount and change
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string | null) => {
    if (!newTheme) return;
    setTheme(newTheme as any);
    setNextTheme(newTheme);
  };

  const handleSave = async () => {
    // Get all current settings from store to save
    const currentSettings = {
      theme: storeTheme,
      language: storeLanguage,
      editorFontSize,
      editorFontFamily,
      editorTabSize,
      editorMinimap,
      editorWordWrap,
      editorLineNumbers,
      editorFormatOnPaste,
      editorFormatOnSave,
      defaultQueryLimit,
      showNullAs,
      dateTimeFormat,
      csvDelimiter,
    };

    await updateSettingsMutation.mutateAsync(currentSettings);
    refetch();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      resetDefaults();
      // Also reset theme
      setNextTheme("system");
      toast.info("Settings have been reset");
    }
  };

  if (!mounted) return null;

  return (
    <div className="container mx-auto py-10 px-4 md:px-8 max-w-6xl">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your interface, editor, data preferences, and account
            settings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-150">
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

        {/* GENERAL SETTINGS */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Behavior</CardTitle>
              <CardDescription>
                Customize how the application looks and feels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <Label htmlFor="theme">Theme</Label>
                <div className="flex items-center space-x-4">
                  <Select value={storeTheme} onValueChange={handleThemeChange}>
                    <SelectTrigger className="w-50">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground">
                    Select your preferred interface theme.
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label htmlFor="language">Language</Label>
                <Select disabled defaultValue="en">
                  <SelectTrigger className="w-50">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Tiếng Việt (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[0.8rem] text-muted-foreground mt-2">
                  Multi-language support is currently under development.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDITOR SETTINGS */}
        <TabsContent value="editor">
          <Card>
            <CardHeader>
              <CardTitle>SQL Editor</CardTitle>
              <CardDescription>
                Configure the code editor experience in SQL Lab.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size (px)</Label>
                  <Input
                    id="font-size"
                    type="number"
                    min={10}
                    max={32}
                    value={editorFontSize}
                    onChange={(e) =>
                      updateEditor({
                        editorFontSize: parseInt(e.target.value) || 14,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tab-size">Tab Size</Label>
                  <Select
                    value={editorTabSize.toString()}
                    onValueChange={(val: string | null) =>
                      val && updateEditor({ editorTabSize: parseInt(val) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tab size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Spaces</SelectItem>
                      <SelectItem value="4">4 Spaces</SelectItem>
                      <SelectItem value="8">8 Spaces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="font-family">Font Family</Label>
                  <Input
                    id="font-family"
                    value={editorFontFamily}
                    onChange={(e) =>
                      updateEditor({ editorFontFamily: e.target.value })
                    }
                    placeholder="'Fira Code', monospace"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Standard CSS font-family string.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="word-wrap">Word Wrap</Label>
                  <Select
                    value={editorWordWrap}
                    onValueChange={(val: string | null) =>
                      val && updateEditor({ editorWordWrap: val as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wrap mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on">On</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="wordWrapColumn">
                        Word Wrap Column
                      </SelectItem>
                      <SelectItem value="bounded">Bounded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line-numbers">Line Numbers</Label>
                  <Select
                    value={editorLineNumbers}
                    onValueChange={(val: string | null) =>
                      val && updateEditor({ editorLineNumbers: val as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select line number mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on">On</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="relative">Relative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Editor Behaviors</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="minimap"
                    checked={editorMinimap}
                    onCheckedChange={(checked) =>
                      updateEditor({ editorMinimap: !!checked })
                    }
                  />
                  <Label htmlFor="minimap">Show Minimap</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="format-paste"
                    checked={editorFormatOnPaste}
                    onCheckedChange={(checked) =>
                      updateEditor({ editorFormatOnPaste: !!checked })
                    }
                  />
                  <Label htmlFor="format-paste">Format on Paste</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="format-save"
                    checked={editorFormatOnSave}
                    onCheckedChange={(checked) =>
                      updateEditor({ editorFormatOnSave: !!checked })
                    }
                  />
                  <Label htmlFor="format-save">Format on Save</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA SETTINGS */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data & Results</CardTitle>
              <CardDescription>
                Manage how query results are displayed and exported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="query-limit">Default Query Limit (Rows)</Label>
                <Input
                  id="query-limit"
                  type="number"
                  value={defaultQueryLimit}
                  onChange={(e) =>
                    updateData({
                      defaultQueryLimit: parseInt(e.target.value) || 100,
                    })
                  }
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  Maximum number of rows to fetch by default to prevent browser
                  crashes.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="null-display">Null Value Display</Label>
                  <Input
                    id="null-display"
                    value={showNullAs}
                    onChange={(e) => updateData({ showNullAs: e.target.value })}
                    placeholder="(null)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Input
                    id="date-format"
                    value={dateTimeFormat}
                    onChange={(e) =>
                      updateData({ dateTimeFormat: e.target.value })
                    }
                    placeholder="YYYY-MM-DD HH:mm:ss"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-delimiter">CSV Export Delimiter</Label>
                  <Select
                    value={csvDelimiter}
                    onValueChange={(val: string | null) =>
                      val && updateData({ csvDelimiter: val as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delimiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">Comma (,)</SelectItem>
                      <SelectItem value=";">Semicolon (;)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACCOUNT SETTINGS */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your profile and security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {user?.name || "User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Button variant="link" className="px-0 h-auto mt-1">
                    Change Avatar
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" defaultValue={user?.name || ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue={user?.email || ""} disabled />
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-medium mb-4">Security</h3>
                <Button variant="outline">Change Password</Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <span className="text-xs text-muted-foreground">
                Last login: {new Date().toLocaleDateString()}
              </span>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
