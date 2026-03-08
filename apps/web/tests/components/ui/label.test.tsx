import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  it("renders a functional Label component", () => {
    render(<Label htmlFor="input-id">Field Label</Label>);
    expect(screen.getByText("Field Label")).toBeInTheDocument();
  });

  it("applies the htmlFor attribute correctly", () => {
    render(<Label htmlFor="test-input">Test Label</Label>);
    const label = screen.getByText("Test Label");
    expect(label).toHaveAttribute("for", "test-input");
  });
});
