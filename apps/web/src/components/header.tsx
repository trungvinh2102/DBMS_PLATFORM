/**
 * @file header.tsx
 * @description Main application header providing global navigation and user profile access.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  GalleryVerticalEnd,
  LogOut,
  Settings2,
  Sparkles,
  SquareTerminal,
  Database,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "./mode-toggle";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Sample data from app-sidebar.tsx
const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Connections",
      url: "/connections",
      icon: Database,
    },
    {
      title: "SQL Lab",
      url: "/sqllab",
      icon: SquareTerminal,
    },

    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
  ],
};

export default function Header() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/auth");

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          <div className="hidden md:block flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">DBMS</span>
          </div>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Main Navigation */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          {data.navMain.map((item) => (
            <Link
              key={item.url}
              href={item.url as any}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.url || pathname?.startsWith(item.url + "/")
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "relative h-8 w-8 rounded-full",
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={data.user.avatar} alt={data.user.name} />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={data.user.avatar}
                        alt={data.user.name}
                      />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {data.user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {data.user.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
