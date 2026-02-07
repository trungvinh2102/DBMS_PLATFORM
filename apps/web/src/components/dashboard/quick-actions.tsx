/**
 * @file apps/web/src/components/dashboard/quick-actions.tsx
 * @description Quick action buttons for common tasks like querying and connecting databases.
 */

"use client";

import Link from "next/link";
import { Plus, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function QuickActions() {
  return (
    <Card className="col-span-3 shadow-sm h-full flex flex-col rounded-xl">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks to get you started</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <Link href="/sqllab" className="block h-full">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-3 items-center justify-center hover:bg-primary/5 hover:border-primary/30 transition-all border-dashed"
            >
              <Zap className="h-6 w-6 text-primary" />
              <span className="font-semibold">Open SQL Lab</span>
            </Button>
          </Link>
          <Link href="/connections" className="block h-full">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col gap-3 items-center justify-center hover:bg-blue-500/5 hover:border-blue-500/30 transition-all border-dashed"
            >
              <Plus className="h-6 w-6 text-blue-500" />
              <span className="font-semibold">New Connection</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
