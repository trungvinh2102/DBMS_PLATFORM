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

    // Check for panel segments (aria-role="none" usually for the group container)
    const panels = container.querySelectorAll("[data-panel]");
    expect(panels.length).toBe(2);
  });
});
