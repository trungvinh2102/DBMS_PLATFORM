/**
 * @file page.tsx
 * @description SSL/TLS certificate management for database connections.
 */

"use client";

import { Database } from "lucide-react";

export default function ConnectionPage() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-background">
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Database className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-slate-400 dark:text-slate-500 font-medium">
          This module is coming soon
        </p>
      </div>
    </div>
  );
}
