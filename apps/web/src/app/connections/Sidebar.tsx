/**
 * @file Sidebar.tsx
 * @description Sidebar navigation component for the Connections page.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Server,
  Shield,
  Eye,
  Activity,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  items: { label: string; href: Route }[];
  defaultExpanded?: boolean;
}

function SidebarSection({
  title,
  icon,
  items,
  defaultExpanded = true,
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 px-4 py-2 text-slate-900 dark:text-slate-100 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md mx-2 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="text-slate-500 dark:text-slate-400">{icon}</div>
        <span className="text-[12px] font-semibold">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 ml-auto transition-transform text-slate-400 dark:text-slate-500",
            isExpanded ? "" : "-rotate-90",
          )}
        />
      </div>
      {isExpanded && (
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block mx-3 px-4 py-2 text-[13px] font-medium transition-all cursor-pointer rounded-md pl-10",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-border bg-white dark:bg-background flex flex-col shrink-0 select-none transition-colors">
      <ScrollArea className="flex-1">
        <div className="space-y-4 py-6">
          <SidebarSection
            title="General"
            icon={<LayoutGrid className="h-4 w-4" />}
            items={[
              { label: "Configurations", href: "/connections/configurations" },
            ]}
          />
          <SidebarSection
            title="Connection Management"
            icon={<Server className="h-4 w-4" />}
            items={[
              {
                label: "Cloud Providers",
                href: "/connections/cloud-providers",
              },
              {
                label: "DB Connections",
                href: "/connections/database-connections",
              },
              {
                label: "SSL Configurations",
                href: "/connections/ssl-configurations",
              },
              {
                label: "SSH Configurations",
                href: "/connections/ssh-configurations",
              },
              {
                label: "Kerberos Configurations",
                href: "/connections/kerberos-configurations",
              },
            ]}
          />
          <SidebarSection
            title="DB Access Control"
            icon={<Shield className="h-4 w-4" />}
            items={[
              { label: "Privilege Type", href: "/connections/privilege-type" },
              { label: "Access Control", href: "/connections/access-control" },
            ]}
          />
          <SidebarSection
            title="Policies"
            icon={<Eye className="h-4 w-4" />}
            items={[
              { label: "Data Access", href: "/connections/data-access" },
              {
                label: "Masking Pattern",
                href: "/connections/masking-pattern",
              },
              { label: "Data Masking", href: "/connections/data-masking" },
              { label: "Sensitive Data", href: "/connections/sensitive-data" },
              {
                label: "Policy Exception",
                href: "/connections/policy-exception",
              },
            ]}
          />
          <SidebarSection
            title="Monitoring"
            icon={<Activity className="h-4 w-4" />}
            items={[
              {
                label: "Running Queries",
                href: "/connections/running-queries",
              },
              {
                label: "Proxy Management",
                href: "/connections/proxy-management",
              },
            ]}
          />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-100 dark:border-border mt-auto">
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-400 dark:text-muted-foreground font-medium">
          <div className="flex items-center gap-1">
            <ChevronDown className="h-4 w-4 rotate-90" />
            <span>v1.2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
