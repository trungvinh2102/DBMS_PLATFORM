import { DocsSidebarNav } from "@/components/docs-sidebar";

const sidebarNavItems = [
  {
    title: "Getting Started",
    items: [
      {
        title: "Introduction",
        href: "/docs",
      },
      {
        title: "Quick Start",
        href: "/docs#quick-start",
      },
    ],
  },
  {
    title: "Core Features",
    items: [
      {
        title: "Database Connections",
        href: "/docs#connections",
      },
      {
        title: "SQL Lab",
        href: "/docs#sqllab",
      },
      {
        title: "Saved Queries",
        href: "/docs#saved-queries",
      },
    ],
  },
  {
    title: "AI Assistant",
    items: [
      {
        title: "Query Generation",
        href: "/docs#ai-generation",
      },
      {
        title: "Explanation",
        href: "/docs#ai-explanation",
      },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground overflow-hidden flex transition-colors">
      {/* Sidebar - same width and style as connections */}
      <aside className="w-64 border-r border-slate-200 dark:border-border bg-white dark:bg-background shrink-0">
        <DocsSidebarNav items={sidebarNavItems} className="h-full" />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white dark:bg-background border-l border-slate-200 dark:border-border transition-colors">
        <div className="max-w-4xl mx-auto py-8 px-8">{children}</div>
      </main>
    </div>
  );
}
