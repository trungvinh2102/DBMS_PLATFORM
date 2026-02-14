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
import { Textarea } from "@/components/ui/textarea";
import { type MaskingPattern, MaskingRuleType } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pattern?: MaskingPattern;
  onSave: (pattern: Partial<MaskingPattern>) => Promise<void>;
}

export function MaskingPatternDialog({
  open,
  onOpenChange,
  pattern,
  onSave,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<MaskingPattern>>({
    name: "",
    description: "",
    maskingType: MaskingRuleType.PARTIAL,
    maskingArgs: "",
  });

  useEffect(() => {
    if (pattern) {
      setFormData(pattern);
    } else {
      setFormData({
        name: "",
        description: "",
        maskingType: MaskingRuleType.PARTIAL,
        maskingArgs: "",
      });
    }
  }, [pattern, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>
            {pattern ? "Edit Pattern" : "Create Pattern"}
          </DialogTitle>
          <DialogDescription>
            Define a reusable masking pattern configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Pattern Name</Label>
            <Input
              id="name"
              placeholder="e.g. US Phone Mask"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              placeholder="e.g. Masks first 6 digits of phone"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
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
            <p className="text-xs text-muted-foreground">
              Examples: {`{"start": 2, "end": 2}`} or{" "}
              {`{"pattern": "^(\\\\d{3})", "replacement": "***"}`}
            </p>
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
              {loading ? "Saving..." : "Save Pattern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
