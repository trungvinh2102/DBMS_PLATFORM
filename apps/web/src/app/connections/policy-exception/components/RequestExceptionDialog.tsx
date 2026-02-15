/**
 * @file RequestExceptionDialog.tsx
 * @description Dialog for requesting a new Policy Exception.
 */

"use client";

import React from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ShieldAlert } from "lucide-react";
import { format, addHours } from "date-fns";
import type {
  PolicyExceptionRequest,
  ExceptionRiskLevel,
} from "@/lib/policy-exception-types";

interface RequestExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PolicyExceptionRequest) => void;
}

export function RequestExceptionDialog({
  open,
  onOpenChange,
  onSubmit,
}: RequestExceptionDialogProps) {
  const form = useForm<PolicyExceptionRequest>({
    defaultValues: {
      subjectType: "USER",
      subjectId: "",
      overridePrivilege: "READ_RAW",
      scope: "TABLE",
      purpose: "",
      startTime: new Date().toISOString(),
      endTime: addHours(new Date(), 4).toISOString(),
      riskLevel: "LOW",
    },
  });

  const handleFormSubmit = (data: PolicyExceptionRequest) => {
    onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-600" />
            Request Policy Exception
          </DialogTitle>
          <DialogDescription>
            Submit a request for temporary access override. All exceptions are
            audited.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subjectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ROLE">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject ID</FormLabel>
                    <FormControl>
                      <Input placeholder="username or role-id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="overridePrivilege"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Override Privilege</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select privilege" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="READ_RAW">READ_RAW</SelectItem>
                        <SelectItem value="UNMASK">UNMASK</SelectItem>
                        <SelectItem value="EXPORT_CSV">EXPORT_CSV</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Purpose</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this exception is needed (e.g., incident investigation EXC-123)"
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            field.value
                              ? format(
                                  new Date(field.value),
                                  "yyyy-MM-dd'T'HH:mm",
                                )
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              new Date(e.target.value).toISOString(),
                            )
                          }
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            field.value
                              ? format(
                                  new Date(field.value),
                                  "yyyy-MM-dd'T'HH:mm",
                                )
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              new Date(e.target.value).toISOString(),
                            )
                          }
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
