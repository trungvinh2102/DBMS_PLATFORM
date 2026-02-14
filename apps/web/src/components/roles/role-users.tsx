"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, roleApi } from "@/lib/api-client";
import type { Role, User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash, Plus, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleUsersProps {
  role: Role;
}

export function RoleUsers({ role }: RoleUsersProps) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch all users to filter locally for now
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userApi.list(),
  });

  const assignedUsers =
    users?.filter((u) => u.roles?.includes(role.name)) || [];
  const availableUsers =
    users?.filter((u) => !u.roles?.includes(role.name)) || [];

  const addRoleMutation = useMutation({
    mutationFn: (userId: string) => userApi.addRole(userId, role.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User added to role");
      setIsAddOpen(false);
      setSelectedUserId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (userId: string) => userApi.removeRole(userId, role.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User removed from role");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAddUser = () => {
    if (selectedUserId) {
      addRoleMutation.mutate(selectedUserId);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className={buttonVariants({ variant: "default" })}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add User to {role.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select
                onValueChange={(val) => val && setSelectedUserId(val)}
                value={selectedUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddUser}
                disabled={!selectedUserId || addRoleMutation.isPending}
                className="w-full"
              >
                {addRoleMutation.isPending ? "Adding..." : "Add User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  {user.username}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeRoleMutation.mutate(user.id)}
                    disabled={
                      role.item_type === "SYSTEM" && user.username === "admin"
                    } // Protect admin account from losing Admin role?
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {assignedUsers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center h-24 text-muted-foreground"
                >
                  No users assigned to this role.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
