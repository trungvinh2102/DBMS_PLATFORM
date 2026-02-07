import { DocsSidebarNav } from "@/components/docs-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 h-full">
      <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block overflow-y-auto border-r py-6 pr-6 lg:py-8">
        <DocsSidebarNav items={sidebarNavItems} />
      </aside>
      <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_200px] h-full overflow-y-auto">
        <div className="mx-auto w-full min-w-0">{children}</div>
      </main>
    </div>
  );
}
