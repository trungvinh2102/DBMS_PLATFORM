/**
 * @file AddPolicyDialog.tsx
 * @description Dialog for adding or editing a sensitive policy.
 */

"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  SensitivePolicy,
  ProtectionStrategy,
  SensitiveResource,
} from "@/lib/sensitive-data-types";
import { Role } from "@/lib/types";

const formSchema = z.object({
  resource_id: z.string().min(1, "Resource is required"),
  role_id: z.string().min(1, "Role is required"),
  privilege_type: z.string().min(1, "Privilege type is required"),
  protection_strategy: z.nativeEnum(ProtectionStrategy),
  policy_expr: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  policy?: SensitivePolicy | null;
  resources: SensitiveResource[];
  roles: Role[];
}

const PRIVILEGE_TYPES = [
  "VIEW_SENSITIVE",
  "VIEW_PII",
  "DECRYPT",
  "UNMASK",
  "EXPORT_SENSITIVE",
];

export function AddPolicyDialog({
  open,
  onOpenChange,
  onSubmit,
  policy,
  resources,
  roles,
}: AddPolicyDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resource_id: "",
      role_id: "",
      privilege_type: "VIEW_SENSITIVE",
      protection_strategy: ProtectionStrategy.MASKING,
      policy_expr: "",
    },
  });

  useEffect(() => {
    if (policy) {
      form.reset({
        resource_id: policy.resource_id,
        role_id: policy.role_id,
        privilege_type: policy.privilege_type,
        protection_strategy: policy.protection_strategy,
        policy_expr: policy.policy_expr || "",
      });
    } else {
      form.reset({
        resource_id: resources[0]?.id || "",
        role_id: roles[0]?.id || "",
        privilege_type: "VIEW_SENSITIVE",
        protection_strategy: ProtectionStrategy.MASKING,
        policy_expr: "",
      });
    }
  }, [policy, open, form, resources, roles]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {policy ? "Edit Policy" : "Add Sensitive Policy"}
          </DialogTitle>
          <DialogDescription>
            Defines how a role can access a sensitive resource.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="resource_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Resource" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {resources.map((res) => (
                        <SelectItem key={res.id} value={res.id}>
                          {res.resource_name} ({res.sensitivity_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="privilege_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Privilege Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Privilege" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIVILEGE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="protection_strategy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protection Strategy</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Strategy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ProtectionStrategy).map((strategy) => (
                        <SelectItem key={strategy} value={strategy}>
                          {strategy.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="policy_expr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Expression (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. location = 'US'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {policy ? "Update" : "Create"} Policy
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
