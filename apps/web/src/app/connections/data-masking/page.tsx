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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaskingPolicyTable } from "./components/masking-policy-table";
import { MaskingPolicyDialog } from "./components/masking-policy-dialog";
import { MaskingPreview } from "./components/masking-preview";
import { maskingApi } from "@/lib/api-client";
import { MaskingPolicy } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner"; // Assuming sonner is installed/configured as per list_dir

export default function MaskingPage() {
  const [policies, setPolicies] = useState<MaskingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<MaskingPolicy | undefined>(
    undefined,
  );

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await maskingApi.list();
      setPolicies(data);
    } catch (err) {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreate = () => {
    setEditingPolicy(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (policy: MaskingPolicy) => {
    setEditingPolicy(policy);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await maskingApi.delete(id);
        toast.success("Policy deleted");
        fetchPolicies();
      } catch (e) {
        toast.error("Failed to delete policy");
      }
    }
  };

  const handleSave = async (data: Partial<MaskingPolicy>) => {
    try {
      if (editingPolicy) {
        await maskingApi.update(editingPolicy.id, data);
        toast.success("Policy updated");
      } else {
        await maskingApi.create(data);
        toast.success("Policy created");
      }
      setDialogOpen(false);
      fetchPolicies();
    } catch (e) {
      toast.error("Failed to save policy");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Masking</h1>
          <p className="text-muted-foreground">
            Manage dynamic data masking rules and policies.
          </p>
        </div>
        <Button onClick={handleCreate}>+ New Policy</Button>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">Masking Policies</TabsTrigger>
          <TabsTrigger value="preview">Preview & Test</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Policies</CardTitle>
              <CardDescription>
                Rules applied to data queries based on user roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <MaskingPolicyTable
                  policies={policies}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <MaskingPreview />
        </TabsContent>
      </Tabs>

      <MaskingPolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policy={editingPolicy}
        onSave={handleSave}
      />
      <Toaster />
    </div>
  );
}
