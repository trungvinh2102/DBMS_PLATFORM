"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type MaskingPolicy, MaskingRuleType } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: MaskingPolicy;
  onSave: (policy: Partial<MaskingPolicy>) => Promise<void>;
}

export function MaskingPolicyDialog({
  open,
  onOpenChange,
  policy,
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<MaskingPolicy>>({
    name: "",
    resourceTable: "",
    resourceColumn: "",
    maskingType: MaskingRuleType.PARTIAL,
    maskingArgs: "",
    isEnabled: true,
  });

  useEffect(() => {
    if (policy) {
      setFormData(policy);
    } else {
      setFormData({
        name: "",
        resourceTable: "",
        resourceColumn: "",
        maskingType: MaskingRuleType.PARTIAL,
        maskingArgs: "",
        isEnabled: true,
      });
    }
  }, [policy, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (e) {
      // Error handled by parent usually
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit Policy" : "Create Policy"}</DialogTitle>
          <DialogDescription>
            Define dynamic data masking rules.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Policy Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="table">Table</Label>
              <Input
                id="table"
                value={formData.resourceTable || ""}
                onChange={(e) =>
                  setFormData({ ...formData, resourceTable: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="column">Column</Label>
              <Input
                id="column"
                value={formData.resourceColumn || ""}
                onChange={(e) =>
                  setFormData({ ...formData, resourceColumn: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role ID (Optional)</Label>
            <Input
              id="role"
              placeholder="Leave empty for all roles"
              value={formData.roleId || ""}
              onChange={(e) =>
                setFormData({ ...formData, roleId: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Masking Type</Label>
            <Select
              value={formData.maskingType}
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  maskingType: val as MaskingRuleType,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MaskingRuleType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="args">Arguments (JSON)</Label>
            <Textarea
              id="args"
              placeholder='e.g. {"start": 2, "end": 2}'
              value={formData.maskingArgs || ""}
              onChange={(e) =>
                setFormData({ ...formData, maskingArgs: e.target.value })
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.isEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isEnabled: checked })
              }
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
