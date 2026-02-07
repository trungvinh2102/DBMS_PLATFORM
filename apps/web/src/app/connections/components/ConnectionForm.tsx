/**
 * @file ConnectionForm.tsx
 * @description Unified form component for database connection with bidirectional URI/fields sync.
 */

import { useCallback, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Globe, ShieldCheck, Lock, Database, Terminal } from "lucide-react";
import { DEFAULT_PORTS, DB_URI_PROTOCOLS } from "./constants";

interface ConnectionFormData {
  name: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  description: string;
  uri: string;
}

interface ConnectionFormProps {
  formData: ConnectionFormData;
  setFormData: (data: ConnectionFormData) => void;
  selectedType: string;
}

/**
 * Parse a database connection URI into individual components
 */
function parseUri(uri: string): Partial<ConnectionFormData> | null {
  try {
    // Handle different URI formats
    // postgresql://user:password@host:port/database
    // mysql://user:password@host:port/database
    // sqlserver://user:password@host:port/database
    // oracle://user:password@host:port/database

    const url = new URL(uri);
    return {
      host: url.hostname || "",
      port: url.port || "",
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "") || "",
    };
  } catch {
    return null;
  }
}

/**
 * Build a connection URI from individual components
 */
function buildUri(
  type: string,
  host: string,
  port: string,
  user: string,
  password: string,
  database: string,
): string {
  const protocol = DB_URI_PROTOCOLS[type] || type;

  // Don't build URI if essential fields are empty
  if (!host && !user && !database) {
    return "";
  }

  try {
    // Use URL constructor to properly encode values
    const url = new URL(`${protocol}://localhost`);
    url.hostname = host || "localhost";
    if (port) url.port = port;
    if (user) url.username = user;
    if (password) url.password = password;
    url.pathname = `/${database}`;

    return url.toString();
  } catch {
    // Fallback to manual construction
    const userPart = user
      ? password
        ? `${user}:${password}@`
        : `${user}@`
      : "";
    const portPart = port ? `:${port}` : "";
    return `${protocol}://${userPart}${host || "localhost"}${portPart}/${database}`;
  }
}

export function ConnectionForm({
  formData,
  setFormData,
  selectedType,
}: ConnectionFormProps) {
  // Track which input triggered the change to prevent loops
  const lastEditSourceRef = useRef<"uri" | "fields" | null>(null);

  // Update URI when individual fields change
  const updateUriFromFields = useCallback(() => {
    if (lastEditSourceRef.current === "uri") {
      lastEditSourceRef.current = null;
      return;
    }

    const newUri = buildUri(
      selectedType,
      formData.host,
      formData.port,
      formData.user,
      formData.password,
      formData.database,
    );

    if (newUri !== formData.uri) {
      setFormData({ ...formData, uri: newUri });
    }
  }, [formData, selectedType, setFormData]);

  // Update fields when URI changes
  const updateFieldsFromUri = useCallback(() => {
    if (lastEditSourceRef.current === "fields") {
      lastEditSourceRef.current = null;
      return;
    }

    const parsed = parseUri(formData.uri);
    if (parsed) {
      // Only update if values actually differ
      const hasChanges =
        (parsed.host !== undefined && parsed.host !== formData.host) ||
        (parsed.port !== undefined && parsed.port !== formData.port) ||
        (parsed.user !== undefined && parsed.user !== formData.user) ||
        (parsed.password !== undefined &&
          parsed.password !== formData.password) ||
        (parsed.database !== undefined &&
          parsed.database !== formData.database);

      if (hasChanges) {
        setFormData({
          ...formData,
          host: parsed.host ?? formData.host,
          port: parsed.port ?? formData.port,
          user: parsed.user ?? formData.user,
          password: parsed.password ?? formData.password,
          database: parsed.database ?? formData.database,
        });
      }
    }
  }, [formData, setFormData]);

  // Sync URI when fields change (with delay to batch changes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateUriFromFields();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [
    formData.host,
    formData.port,
    formData.user,
    formData.password,
    formData.database,
    selectedType,
  ]);

  // Handle field input changes
  const handleFieldChange = (
    field: keyof ConnectionFormData,
    value: string,
  ) => {
    lastEditSourceRef.current = "fields";

    // Auto-set default port when type changes or port is empty
    let newPort = field === "port" ? value : formData.port;
    if (field !== "port" && !formData.port && field === "host") {
      newPort = DEFAULT_PORTS[selectedType] || "";
    }

    setFormData({
      ...formData,
      [field]: value,
      port: newPort,
    });
  };

  // Handle URI input changes
  const handleUriChange = (value: string) => {
    lastEditSourceRef.current = "uri";
    setFormData({ ...formData, uri: value });

    // Parse and update fields after a delay
    setTimeout(() => {
      updateFieldsFromUri();
    }, 150);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* URI Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-slate-300 dark:bg-white/20 rounded-full" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20">
            Connection URI
          </span>
        </div>
        <div className="space-y-2 px-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
            Connection String
          </Label>
          <div className="relative">
            <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/20" />
            <Input
              placeholder={
                selectedType === "postgres"
                  ? "postgresql://user:password@localhost:5432/database"
                  : selectedType === "mysql"
                    ? "mysql://user:password@localhost:3306/database"
                    : selectedType === "sqlserver"
                      ? "sqlserver://user:password@localhost:1433/database"
                      : "oracle://user:password@localhost:1521/database"
              }
              value={formData.uri}
              onChange={(e) => handleUriChange(e.target.value)}
              className="h-12 pl-12 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-mono font-bold text-slate-600 dark:text-white/60"
            />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-white/30 ml-1">
            Enter URI directly or fill in the fields below - they sync
            automatically
          </p>
        </div>
      </div>

      {/* Network Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-slate-300 dark:bg-white/20 rounded-full" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20">
            Network Configuration
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
          <div className="md:col-span-3 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
              Host
            </Label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/20" />
              <Input
                required
                value={formData.host}
                onChange={(e) => handleFieldChange("host", e.target.value)}
                className="h-11 pl-10 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-mono font-bold text-slate-700 dark:text-white/80"
                placeholder="localhost"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
              Port
            </Label>
            <Input
              required
              value={formData.port}
              onChange={(e) => handleFieldChange("port", e.target.value)}
              className="h-11 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-mono font-bold text-center text-slate-700 dark:text-white/80"
              placeholder={DEFAULT_PORTS[selectedType] || "5432"}
            />
          </div>
        </div>
      </div>

      {/* Credentials Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-slate-300 dark:bg-white/20 rounded-full" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20">
            Authentication
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
              Username
            </Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/20" />
              <Input
                required
                value={formData.user}
                onChange={(e) => handleFieldChange("user", e.target.value)}
                className="h-11 pl-10 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80"
                placeholder="postgres"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/20" />
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                className="h-11 pl-10 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div className="px-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 ml-1">
              Database Name
            </Label>
            <div className="relative">
              <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/20" />
              <Input
                required
                placeholder="mydb"
                value={formData.database}
                onChange={(e) => handleFieldChange("database", e.target.value)}
                className="h-11 pl-10 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
