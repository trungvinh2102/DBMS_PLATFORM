"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  BookOpen,
  Database,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  items: {
    title: string;
    href: string;
    disabled?: boolean;
  }[];
  currentHash: string;
  pathname: string;
  defaultExpanded?: boolean;
}

function SidebarSection({
  title,
  icon,
  items,
  currentHash,
  pathname,
  defaultExpanded = true,
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isActive = (href: string) => {
    const hrefHash = href.includes("#") ? "#" + href.split("#")[1] : "";
    const hrefPath = href.split("#")[0];

    if (!hrefHash) {
      return pathname === hrefPath && !currentHash;
    }

    return currentHash === hrefHash;
  };

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
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "mx-3 px-4 py-2 text-[13px] font-medium transition-all cursor-pointer rounded-md pl-10 block",
                isActive(item.href)
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200",
                item.disabled && "pointer-events-none opacity-50",
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const sectionIcons: Record<string, LucideIcon> = {
  "Getting Started": BookOpen,
  "Core Features": Database,
  "AI Assistant": Sparkles,
  Configuration: Settings,
};

interface DocsSidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    title: string;
    items: {
      title: string;
      href: string;
      disabled?: boolean;
    }[];
  }[];
}

export function DocsSidebarNav({
  className,
  items,
  ...props
}: DocsSidebarNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
    };

    updateHash();

    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  return (
    <aside
      className={cn(
        "w-full bg-white dark:bg-background flex flex-col shrink-0 select-none transition-colors h-full",
        className,
      )}
      {...props}
    >
      <ScrollArea className="flex-1">
        <div className="space-y-4 py-6">
          {items.map((item, index) => {
            const IconComponent = sectionIcons[item.title] || BookOpen;
            return (
              <SidebarSection
                key={index}
                title={item.title}
                icon={<IconComponent className="h-4 w-4" />}
                items={item.items}
                pathname={pathname}
                currentHash={currentHash}
              />
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-100 dark:border-border mt-auto">
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-400 dark:text-muted-foreground font-medium">
          <div className="flex items-center gap-1">
            <ChevronDown className="h-4 w-4 rotate-90" />
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
