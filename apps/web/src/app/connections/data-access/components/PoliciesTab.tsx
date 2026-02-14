/**
 * @file PoliciesTab.tsx
 * @description Tab for managing fine-grained data access policies.
 */

"use client";

import { useState, useEffect } from "react";
import { dataAccessApi } from "@/lib/api-client";
import { DataAccessPolicy, PolicySubjectType } from "@/lib/data-access-types";
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
import { Plus, Gavel } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PoliciesTab() {
  const [policies, setPolicies] = useState<DataAccessPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await dataAccessApi.listAccessPolicies();
      setPolicies(data);
    } catch (error) {
      toast({
        title: "Error loading policies",
        description: "Failed to fetch access policies.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Access Policies</h3>
        {/* Simplified for MVP: Create button is placeholder */}
        <Button variant="outline" disabled>
          <Plus className="mr-2 h-4 w-4" /> Create Policy (Coming Soon)
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Privilege</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : policies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center h-24 text-muted-foreground"
                >
                  No access policies defined.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-muted-foreground" />
                    {p.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.subjectType}</Badge>{" "}
                    <span className="ml-1 text-sm">{p.subjectId}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                      {p.privilegeCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.environmentCondition || "None"}
                  </TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "destructive"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
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
