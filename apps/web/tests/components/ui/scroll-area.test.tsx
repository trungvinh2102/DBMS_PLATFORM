import { describe, it, expect } from "vitest";
import { render, screen } from "../../test-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

describe("ScrollArea", () => {
  it("renders children in a viewport", () => {
    render(
      <ScrollArea className="h-40">
        <div data-testid="scroll-content">Large Content</div>
      </ScrollArea>,
    );
    expect(screen.getByTestId("scroll-content")).toBeInTheDocument();
  });
});
