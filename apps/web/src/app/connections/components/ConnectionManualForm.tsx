/**
 * @file ConnectionManualForm.tsx
 * @description Form component for manual database connection configuration (host, port, user, etc.).
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Globe, ShieldCheck, Lock, Database } from "lucide-react";

interface ConnectionManualFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ConnectionManualForm({
  formData,
  setFormData,
}: ConnectionManualFormProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-white/20 rounded-full" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
            Phase 02: Network Layout
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
          <div className="md:col-span-3 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              Host Infrastructure
            </Label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <Input
                required
                value={formData.host}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    host: e.target.value,
                  })
                }
                className="h-11 pl-10 border-white/10 bg-white/5 rounded-xl font-mono font-bold text-white/80"
                placeholder="db.production.cluster"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              Gate
            </Label>
            <Input
              required
              value={formData.port}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  port: e.target.value,
                })
              }
              className="h-11 border-white/10 bg-white/5 rounded-xl font-mono font-bold text-center text-white/80"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-4 bg-white/20 rounded-full" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
            Phase 03: Security & Target
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              Access Key
            </Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <Input
                required
                value={formData.user}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    user: e.target.value,
                  })
                }
                className="h-11 pl-10 border-white/10 bg-white/5 rounded-xl font-bold text-white/80"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              Security Token
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    password: e.target.value,
                  })
                }
                className="h-11 pl-10 border-white/10 bg-white/5 rounded-xl font-bold text-white/80"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              Target Instance
            </Label>
            <div className="relative">
              <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <Input
                required
                placeholder="SYSTEM_INDEX"
                value={formData.database}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    database: e.target.value,
                  })
                }
                className="h-11 pl-10 border-white/10 bg-white/5 rounded-xl font-bold text-white/80"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
              Action Purpose
            </Label>
            <Input
              placeholder="Brief reason for connection..."
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              className="h-11 border-white/10 bg-white/5 rounded-xl font-bold text-[11px] focus-visible:border-white/30 transition-all placeholder:text-white/5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
