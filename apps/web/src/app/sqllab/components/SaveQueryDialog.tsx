/**
 * @file SaveQueryDialog.tsx
 * @description Dialog component for naming and saving SQL queries to the database.
 */

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface SaveQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    name: string,
    description?: string,
    options?: { saveToWorkspace?: boolean; scriptPath?: string },
  ) => void;
  defaultName?: string;
  defaultScriptPath?: string;
}

export function SaveQueryDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultName = "",
  defaultScriptPath = "",
}: SaveQueryDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [saveToWorkspace, setSaveToWorkspace] = useState(Boolean(defaultScriptPath));
  const [scriptPath, setScriptPath] = useState(defaultScriptPath);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setScriptPath(defaultScriptPath);
    setSaveToWorkspace(Boolean(defaultScriptPath));
  }, [defaultName, defaultScriptPath, open]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm(name.trim(), description.trim(), {
      saveToWorkspace,
      scriptPath: scriptPath.trim(),
    });
    setName("");
    setDescription("");
    setScriptPath("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Query</DialogTitle>
          <DialogDescription>
            Give your query a name and optional description to find it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Awesome Query"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Query to fetch all active users..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={saveToWorkspace}
                onCheckedChange={(checked) => setSaveToWorkspace(Boolean(checked))}
              />
              Save a SQL script in the workspace folder
            </label>
            {saveToWorkspace && (
              <div className="mt-3 grid gap-2">
                <Label htmlFor="scriptPath">Script path</Label>
                <Input
                  id="scriptPath"
                  placeholder="reports/monthly_revenue.sql"
                  value={scriptPath}
                  onChange={(e) => setScriptPath(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Save Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
