"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

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
  const pathname = usePathname();

  return (
    <div className={cn("pb-12", className)} {...props}>
      {items.map((item, index) => (
        <div key={index} className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {item.title}
          </h2>
          {item.items?.length ? (
            <div className="space-y-1">
              {item.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    pathname === item.href
                      ? "bg-muted hover:bg-muted"
                      : "hover:bg-transparent hover:underline",
                    "w-full justify-start",
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
