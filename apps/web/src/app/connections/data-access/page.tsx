/**
 * @file page.tsx
 * @description Data access control management page with Resources, Masking, and Policies tabs.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResourcesTab from "./components/ResourcesTab";
import MaskingTab from "./components/MaskingTab";
import PoliciesTab from "./components/PoliciesTab";
import { Shield, Lock, Database } from "lucide-react";

export default function DataAccessPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-background p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Data Security & Access Control
        </h1>
        <p className="text-muted-foreground">
          Manage sensitive data resources, define masking policies, and control
          access permissions.
        </p>
      </div>

      <Tabs defaultValue="resources" className="w-full space-y-4">
        <TabsList className="bg-muted p-1 border">
          <TabsTrigger
            value="resources"
            className="data-[state=active]:bg-background"
          >
            Resources
          </TabsTrigger>
          <TabsTrigger
            value="masking"
            className="data-[state=active]:bg-background"
          >
            Masking Policies
          </TabsTrigger>
          <TabsTrigger
            value="policies"
            className="data-[state=active]:bg-background"
          >
            Access Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="resources"
          className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm"
        >
          <ResourcesTab />
        </TabsContent>

        <TabsContent
          value="masking"
          className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm"
        >
          <MaskingTab />
        </TabsContent>

        <TabsContent
          value="policies"
          className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm"
        >
          <PoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
