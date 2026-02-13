/**
 * @file PrivilegeDialogs.tsx
 * @description Dialog components for creating, editing, and deleting privilege types.
 */

import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CATEGORY_ORDER, CATEGORY_CONFIG } from "../constants";
import type { PrivilegeType, PrivilegeFormData } from "../types";

interface PrivilegeDialogsProps {
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  editingItem: PrivilegeType | null;
  setEditingItem: (item: PrivilegeType | null) => void;
  deleteItem: PrivilegeType | null;
  setDeleteItem: (item: PrivilegeType | null) => void;
  formData: PrivilegeFormData;
  setFormData: React.Dispatch<React.SetStateAction<PrivilegeFormData>>;
  onCreate: (data: PrivilegeFormData) => void;
  onUpdate: (id: string, data: PrivilegeFormData) => void;
  onDelete: (id: string) => void;
  isCreatePending: boolean;
  isUpdatePending: boolean;
  isDeletePending: boolean;
}

export function PrivilegeDialogs({
  isCreateOpen,
  setIsCreateOpen,
  editingItem,
  setEditingItem,
  deleteItem,
  setDeleteItem,
  formData,
  setFormData,
  onCreate,
  onUpdate,
  onDelete,
  isCreatePending,
  isUpdatePending,
  isDeletePending,
}: PrivilegeDialogsProps) {
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({
      ...p,
      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
    }));
  };

  return (
    <>
      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Create Privilege Type
            </DialogTitle>
            <DialogDescription>
              Add a new privilege type to the registry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="e.g., READ_CUSTOM"
                value={formData.code}
                onChange={handleCodeChange}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) =>
                  setFormData((p: any) => ({ ...p, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat]?.label || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this privilege allows..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => onCreate(formData)}
              disabled={!formData.code || isCreatePending}
              className="bg-linear-to-r from-blue-600 to-indigo-600"
            >
              {isCreatePending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Privilege Type
            </DialogTitle>
            <DialogDescription>
              Update privilege type details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Same form as above */}
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={handleCodeChange}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) =>
                  setFormData((p: any) => ({ ...p, category: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat]?.label || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingItem && onUpdate(editingItem.id, formData)}
              disabled={!formData.code || isUpdatePending}
              className="bg-linear-to-r from-blue-600 to-indigo-600"
            >
              {isUpdatePending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Delete Privilege Type
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {deleteItem?.code}
              </span>
              ? This action cannot be undone and will remove all role
              assignments for this privilege.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteItem && onDelete(deleteItem.id)}
              disabled={isDeletePending}
            >
              {isDeletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
