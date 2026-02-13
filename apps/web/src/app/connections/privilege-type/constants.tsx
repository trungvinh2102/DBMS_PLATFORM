/**
 * @file constants.tsx
 * @description Constants and configuration for Privilege Type categories.
 */

import {
  Database,
  Pencil,
  Code2,
  FileOutput,
  Eye,
  Settings2,
} from "lucide-react";

export const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  DATA_ACCESS: {
    label: "Data Access",
    icon: <Database className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800/50",
  },
  DATA_MUTATION: {
    label: "Data Mutation",
    icon: <Pencil className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800/50",
  },
  QUERY_CAPABILITY: {
    label: "Query Capability",
    icon: <Code2 className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800/50",
  },
  DATA_EXFILTRATION: {
    label: "Data Exfiltration Control",
    icon: <FileOutput className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800/50",
  },
  SENSITIVE: {
    label: "Sensitive Data",
    icon: <Eye className="h-4 w-4" />,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800/50",
  },
  SYSTEM: {
    label: "System",
    icon: <Settings2 className="h-4 w-4" />,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
};

export const CATEGORY_ORDER = [
  "DATA_ACCESS",
  "DATA_MUTATION",
  "QUERY_CAPABILITY",
  "DATA_EXFILTRATION",
  "SENSITIVE",
  "SYSTEM",
];
