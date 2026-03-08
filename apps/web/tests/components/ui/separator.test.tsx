import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Separator } from "@/components/ui/separator";

describe("Separator", () => {
  it("renders a vertical Separator", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveAttribute("data-orientation", "vertical");
  });

  it("renders a horizontal Separator by default", () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
  });
});
