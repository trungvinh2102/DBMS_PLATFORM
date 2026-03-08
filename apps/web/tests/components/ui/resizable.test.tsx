import { describe, it, expect } from "vitest";
import { render } from "../../test-utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

describe("Resizable", () => {
  it("renders panel group and handles", () => {
    const { container } = render(
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25}>One</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>Two</ResizablePanel>
      </ResizablePanelGroup>,
    );

    // Check for panel segments
    const panels = container.querySelectorAll("[data-panel]");
    expect(panels.length).toBe(2);
  });

  it("renders vertical direction and handle icon", () => {
    const { container } = render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={25}>One</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>Two</ResizablePanel>
      </ResizablePanelGroup>,
    );

    // Instead of checking classes on a specific element that might be a wrapper,
    // check if any element has the flex-col class which we added.
    const groupElement = container.querySelector(".flex-col");
    expect(groupElement).toBeInTheDocument();

    // Check for the handle icon div
    expect(container.querySelector(".bg-border.h-6.w-1")).toBeInTheDocument();
  });
});
