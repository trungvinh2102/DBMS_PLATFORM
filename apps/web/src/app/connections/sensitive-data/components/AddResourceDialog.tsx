/**
 * @file AddResourceDialog.tsx
 * @description Dialog for adding or editing a sensitive resource.
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
  SensitiveResource,
  SensitivityLevel,
  ResourceType,
} from "@/lib/sensitive-data-types";

const formSchema = z.object({
  resource_type: z.nativeEnum(ResourceType),
  resource_name: z.string().min(1, "Resource name is required"),
  sensitivity_level: z.nativeEnum(SensitivityLevel),
  owner: z.string().optional(),
  description: z.string().optional(),
  database_id: z.string().min(1, "Database ID is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => void;
  resource?: SensitiveResource | null;
  databases: { id: string; name: string }[];
}

export function AddResourceDialog({
  open,
  onOpenChange,
  onSubmit,
  resource,
  databases,
}: AddResourceDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resource_type: ResourceType.TABLE,
      resource_name: "",
      sensitivity_level: SensitivityLevel.INTERNAL,
      owner: "",
      description: "",
      database_id: "",
    },
  });

  useEffect(() => {
    if (resource) {
      form.reset({
        resource_type: resource.resource_type,
        resource_name: resource.resource_name,
        sensitivity_level: resource.sensitivity_level,
        owner: resource.owner || "",
        description: resource.description || "",
        database_id: resource.database_id,
      });
    } else {
      form.reset({
        resource_type: ResourceType.TABLE,
        resource_name: "",
        sensitivity_level: SensitivityLevel.INTERNAL,
        owner: "",
        description: "",
        database_id: databases[0]?.id || "",
      });
    }
  }, [resource, open, form, databases]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {resource ? "Edit Resource" : "Add Sensitive Resource"}
          </DialogTitle>
          <DialogDescription>
            {resource
              ? "Update the details of the sensitive resource."
              : "Register a new resource that contains sensitive data."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="database_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Database" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {databases.map((db) => (
                          <SelectItem key={db.id} value={db.id}>
                            {db.name}
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
                name="resource_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(ResourceType).map((type) => (
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
              name="resource_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. public.users.email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sensitivity_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sensitivity Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(SensitivityLevel).map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
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
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Team or User" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the sensitive data..."
                      {...field}
                    />
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
                {resource ? "Update" : "Create"} Resource
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
