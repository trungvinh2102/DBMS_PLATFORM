/**
 * @file ConfigFields.tsx
 * @description Shared field components for ConnectionConfig.
 */

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ToggleFieldProps {
  label: string;
}

export function ToggleField({ label }: ToggleFieldProps) {
  return (
    <div className="space-y-3">
      <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="flex bg-muted/20 p-1 border border-border w-fit rounded-md">
        <button className="px-3 py-1 text-[10px] font-semibold uppercase bg-background text-foreground shadow-sm border border-border transition-all rounded-sm">
          On
        </button>
        <button className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground hover:text-foreground transition-all">
          Off
        </button>
      </div>
    </div>
  );
}

interface CheckboxLabelProps {
  label: string;
}

export function CheckboxLabel({ label }: CheckboxLabelProps) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <Checkbox className="h-4 w-4 rounded border-muted-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:text-background" />
      <span className="text-[12px] font-medium text-muted-foreground group-hover:text-foreground transition-opacity">
        {label}
      </span>
    </div>
  );
}
