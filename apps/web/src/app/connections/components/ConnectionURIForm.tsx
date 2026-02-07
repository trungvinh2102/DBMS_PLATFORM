/**
 * @file ConnectionURIForm.tsx
 * @description Form component for database connection configuration using a URI string.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Terminal } from "lucide-react";

interface ConnectionURIFormProps {
  formData: any;
  setFormData: (data: any) => void;
  selectedType: string;
}

export function ConnectionURIForm({
  formData,
  setFormData,
  selectedType,
}: ConnectionURIFormProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-1 w-4 bg-white/20 rounded-full" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
          Phase 02: Protocol Mapping
        </span>
      </div>
      <div className="space-y-2 px-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
          Connection URI
        </Label>
        <div className="relative">
          <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
          <Input
            required
            placeholder={
              selectedType === "postgres"
                ? "postgresql://admin:***@localhost:5432/main"
                : "mysql://admin:***@localhost:3306/main"
            }
            value={formData.uri}
            onChange={(e) =>
              setFormData({
                ...formData,
                uri: e.target.value,
              })
            }
            className="h-12 pl-12 border-white/10 bg-white/5 rounded-xl font-mono font-bold text-white/60"
          />
        </div>
      </div>
    </div>
  );
}
