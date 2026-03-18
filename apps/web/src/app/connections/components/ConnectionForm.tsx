"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Globe, ShieldCheck, Lock, Database, Terminal, Eye, EyeOff } from "lucide-react";
import { DEFAULT_PORTS } from "./constants";
import { useConnectionSync, type ConnectionFormData } from "../lib/use-connection-sync";
import { maskPasswordInUri } from "../lib/uri-utils";

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
  const [showPassword, setShowPassword] = useState(false);
  
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
                required={selectedType !== "redis" && selectedType !== "mongodb"}
                value={formData.user}
                onChange={(e) => handleFieldChange("user", e.target.value)}
                className="h-11 pl-10 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80"
                placeholder={selectedType === "redis" || selectedType === "mongodb" ? "optional" : "username"}
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
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleFieldChange("password", e.target.value)}
                className="h-11 pl-10 pr-10 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-bold text-slate-700 dark:text-white/80"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/20 dark:hover:text-white/50 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
                      : selectedType === "mongodb"
                      ? "mongodb://user:password@localhost:27017/database"
                      : selectedType === "clickhouse"
                      ? "clickhouse://user:password@localhost:8123/database"
                      : selectedType === "redis"
                        ? "redis://:password@localhost:6379/0"
                        : "oracle://user:password@localhost:1521/database"
              }
              value={showPassword ? formData.uri : maskPasswordInUri(formData.uri)}
              onChange={(e) => showPassword && handleUriChange(e.target.value)}
              readOnly={!showPassword}
              className="h-12 pl-12 pr-12 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl font-mono font-bold text-slate-600 dark:text-white/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/20 dark:hover:text-white/50 transition-colors"
              title={showPassword ? "Hide password in URI" : "Show password in URI"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
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
