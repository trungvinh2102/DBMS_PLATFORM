/**
 * @file ResourcesTab.tsx
 * @description Tab for managing data resources and their sensitivity levels.
 */

"use client";

import { useState, useEffect } from "react";
import { dataAccessApi } from "@/lib/api-client";
import type { DataResource } from "@/lib/data-access-types";
import { SensitivityLevel } from "@/lib/data-access-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Database, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ResourcesTab() {
  const [resources, setResources] = useState<DataResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<DataResource>>({
    resourceType: "TABLE",
    sensitivity: SensitivityLevel.INTERNAL,
    databaseId: "default-db", // simplified for MVP
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await dataAccessApi.listResources();
      setResources(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error loading resources",
        description: "Failed to fetch data resources.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await dataAccessApi.createResource(formData);
      toast({
        title: "Resource created",
        description: "Successfully added new resource.",
      });
      setIsCreateOpen(false);
      loadResources();
    } catch (error) {
      toast({
        title: "Error creating resource",
        description: "Failed to create resource.",
        variant: "destructive",
      });
    }
  };

  const getSensitivityColor = (level: SensitivityLevel) => {
    switch (level) {
      case SensitivityLevel.PUBLIC:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case SensitivityLevel.INTERNAL:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case SensitivityLevel.CONFIDENTIAL:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case SensitivityLevel.PII:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case SensitivityLevel.CRITICAL:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search resources..." className="pl-8" />
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Resource
        </Button>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Data Resource</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Database ID</Label>
                <Input
                  value={formData.databaseId}
                  onChange={(e) =>
                    setFormData({ ...formData, databaseId: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Schema Name</Label>
                <Input
                  value={formData.schemaName}
                  onChange={(e) =>
                    setFormData({ ...formData, schemaName: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Table Name</Label>
                <Input
                  value={formData.tableName}
                  onChange={(e) =>
                    setFormData({ ...formData, tableName: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Column Name (Optional)</Label>
                <Input
                  value={formData.columnName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, columnName: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Sensitivity Level</Label>
                <Select
                  value={formData.sensitivity}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      sensitivity: val as SensitivityLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SensitivityLevel).map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resource</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Sensitivity</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : resources.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  No resources found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              resources.map((res) => (
                <TableRow key={res.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    {res.tableName}
                    {res.columnName && (
                      <span className="text-muted-foreground">
                        .{res.columnName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{res.resourceType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {res.databaseId} / {res.schemaName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getSensitivityColor(res.sensitivity)}
                      variant="secondary"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {res.sensitivity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {res.tags ? JSON.stringify(res.tags) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
