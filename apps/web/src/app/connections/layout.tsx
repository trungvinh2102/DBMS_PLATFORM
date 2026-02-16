/**
 * @file layout.tsx
 * @description Layout component for the connections section, providing a consistent sidebar.
 */

import { Sidebar } from "./Sidebar";
import { PrivilegeGuard } from "@/components/auth/PrivilegeGuard";

interface ConnectionsLayoutProps {
  children: React.ReactNode;
}

export default function ConnectionsLayout({
  children,
}: ConnectionsLayoutProps) {
  return (
    <PrivilegeGuard privilege="CONNECTIONS_ACCESS">
      <div className="h-screen w-full bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground overflow-hidden flex transition-colors">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-white dark:bg-background border-l border-slate-200 dark:border-border transition-colors">
          {children}
        </main>
      </div>
    </PrivilegeGuard>
  );
}
