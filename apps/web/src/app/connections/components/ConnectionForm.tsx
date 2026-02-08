/**
 * @file ConnectionForm.tsx
 * @description Unified form component for database connection with bidirectional URI/fields sync.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Globe, ShieldCheck, Lock, Database, Terminal } from "lucide-react";
import { DEFAULT_PORTS } from "./constants";
import { useConnectionSync } from "../lib/use-connection-sync";
import type { ConnectionFormData } from "../lib/use-connection-sync";

interface ConnectionFormProps {
  formData: ConnectionFormData;
  setFormData: (data: ConnectionFormData) => void;
  selectedType: string;
}

export function ConnectionForm({
  formData,
  setFormData,
  selectedType,
}: ConnectionFormProps) {
  const { handleFieldChange, handleUriChange } = useConnectionSync(
    formData,
    setFormData,
    selectedType,
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
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
    </div>
  );
}
