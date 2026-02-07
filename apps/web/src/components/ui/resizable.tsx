"use client";

import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  direction,
  ...props
}: React.ComponentProps<typeof Group> & {
  direction?: "horizontal" | "vertical";
}) {
  return (
    <Group
      className={cn(
        "flex h-full w-full",
        direction === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
      orientation={direction}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      className={cn(
        "bg-border relative flex items-center justify-center after:absolute data-[orientation=horizontal]:h-full data-[orientation=horizontal]:w-px data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border h-6 w-1 rounded-none z-10 flex shrink-0" />
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
