/**
 * @file ConnectionsConfiguration.tsx
 * @description Component for managing global connection settings and defaults.
 */

import { useState, useEffect } from "react";
import { Save, Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import type { UserSettings } from "@/hooks/use-settings";

const DEFAULT_SETTINGS: UserSettings = {
  connectionDefaults: {
    timeout: 10,
    keepAliveInterval: 60,
    maxPoolSize: 10,
  },
  securityDefaults: {
    enforceSSL: false,
    sslMode: "prefer",
  },
};

export function ConnectionsConfiguration() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();
  const [formData, setFormData] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Sync state with fetched settings
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setFormData((prev) => ({
        ...prev,
        ...settings,
        connectionDefaults: {
          ...prev.connectionDefaults,
          ...settings.connectionDefaults,
        },
        securityDefaults: {
          ...prev.securityDefaults,
          ...settings.securityDefaults,
        },
      }));
    }
  }, [settings]);

  const handleChange = (
    section: "connectionDefaults" | "securityDefaults",
    field: string,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    updateSettings(formData);
  };

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS);
    toast.info("Settings reset to defaults (unsaved)");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Global Configuration
          </h2>
          <p className="text-muted-foreground">
            Manage defaults and preferences for all database connections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            {isUpdating ? (
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connection Defaults</CardTitle>
            <CardDescription>
              Set default parameters for new connections.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Default Timeout (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={formData.connectionDefaults?.timeout}
                  onChange={(e) =>
                    handleChange(
                      "connectionDefaults",
                      "timeout",
                      parseInt(e.target.value) || 0,
                    )
                  }
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  Time to wait before a connection attempt fails.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Keep-Alive Interval (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.connectionDefaults?.keepAliveInterval}
                  onChange={(e) =>
                    handleChange(
                      "connectionDefaults",
                      "keepAliveInterval",
                      parseInt(e.target.value) || 0,
                    )
                  }
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  Interval for sending keep-alive packets. Set 0 to disable.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Pool Size</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.connectionDefaults?.maxPoolSize}
                onChange={(e) =>
                  handleChange(
                    "connectionDefaults",
                    "maxPoolSize",
                    parseInt(e.target.value) || 0,
                  )
                }
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Maximum number of connections in the pool per database.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Defaults</CardTitle>
            <CardDescription>
              Configure default security policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Enforce SSL</Label>
                <p className="text-sm text-muted-foreground">
                  Require SSL for all new connections by default.
                </p>
              </div>
              <Switch
                checked={formData.securityDefaults?.enforceSSL}
                onCheckedChange={(checked) =>
                  handleChange("securityDefaults", "enforceSSL", checked)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Default SSL Mode</Label>
              <Select
                value={formData.securityDefaults?.sslMode}
                onValueChange={(value) =>
                  handleChange("securityDefaults", "sslMode", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SSL mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disable">Disable</SelectItem>
                  <SelectItem value="prefer">Prefer</SelectItem>
                  <SelectItem value="require">Require</SelectItem>
                  <SelectItem value="verify-ca">Verify CA</SelectItem>
                  <SelectItem value="verify-full">Verify Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Management</CardTitle>
            <CardDescription>
              Import or export connection configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1 h-24 flex-col gap-2">
                <Download className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Export Connections</div>
                  <div className="text-xs text-muted-foreground">
                    Download generic JSON config
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="flex-1 h-24 flex-col gap-2">
                <Upload className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Import Connections</div>
                  <div className="text-xs text-muted-foreground">
                    Upload JSON configuration file
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
