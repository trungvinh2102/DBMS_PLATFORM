"use client";

import { type MaskingPattern } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  patterns: MaskingPattern[];
  onEdit: (pattern: MaskingPattern) => void;
  onDelete: (id: string) => void;
}

export function MaskingPatternTable({ patterns, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pattern Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Arguments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patterns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No patterns found.
              </TableCell>
            </TableRow>
          ) : (
            patterns.map((pattern) => (
              <TableRow key={pattern.id}>
                <TableCell className="font-medium">{pattern.name}</TableCell>
                <TableCell>{pattern.description || "-"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{pattern.maskingType}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {pattern.maskingArgs || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(pattern)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={() => onDelete(pattern.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
