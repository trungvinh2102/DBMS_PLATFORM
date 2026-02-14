"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MaskingPatternTable } from "./components/masking-pattern-table";
import { MaskingPatternDialog } from "./components/masking-pattern-dialog";
import { maskingApi } from "@/lib/api-client";
import { type MaskingPattern } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function MaskingPatternPage() {
  const [patterns, setPatterns] = useState<MaskingPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<
    MaskingPattern | undefined
  >(undefined);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const data = await maskingApi.listPatterns();
      setPatterns(data);
    } catch (err) {
      toast.error("Failed to load masking patterns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCreate = () => {
    setEditingPattern(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (pattern: MaskingPattern) => {
    setEditingPattern(pattern);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (
      confirm("Are you sure? This pattern might be used by active policies.")
    ) {
      try {
        await maskingApi.deletePattern(id);
        toast.success("Pattern deleted");
        fetchPatterns();
      } catch (e) {
        toast.error("Failed to delete pattern");
      }
    }
  };

  const handleSave = async (data: Partial<MaskingPattern>) => {
    try {
      if (editingPattern) {
        await maskingApi.updatePattern(editingPattern.id, data);
        toast.success("Pattern updated");
      } else {
        await maskingApi.createPattern(data);
        toast.success("Pattern created");
      }
      setDialogOpen(false);
      fetchPatterns();
    } catch (e) {
      toast.error("Failed to save pattern");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Masking Types</h1>
          <p className="text-muted-foreground">
            Define reusable masking types and patterns for data protection
            policies.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Pattern
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Defined Patterns</CardTitle>
          <CardDescription>
            Library of masking functions available for policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <MaskingPatternTable
              patterns={patterns}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      <MaskingPatternDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pattern={editingPattern}
        onSave={handleSave}
      />
      <Toaster />
    </div>
  );
}
