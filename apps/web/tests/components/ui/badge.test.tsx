/**
 * @file badge.test.tsx
 * @description Unit tests for the Badge component, focusing on renders and color variants.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/components/ui/badge";

describe("Badge Component", () => {
  it("renders text correctly", () => {
    const TEXT = "Badge Message";
    render(<Badge>{TEXT}</Badge>);
    expect(screen.getByText(TEXT)).toBeInTheDocument();
  });

  it("applies decorative variant classes", () => {
    const { rerender } = render(<Badge variant="destructive">Error</Badge>);
    let badge = screen.getByText("Error");
    // Destructive badge has text-destructive and bg-destructive
    expect(badge).toHaveClass("text-destructive");

    rerender(<Badge variant="outline">Outline</Badge>);
    badge = screen.getByText("Outline");
    expect(badge).toHaveClass("text-foreground");
  });

  it("applies custom className", () => {
    const CUSTOM_CLASS = "bg-blue-500 test-class";
    render(<Badge className={CUSTOM_CLASS}>Custom Badge</Badge>);
    expect(screen.getByText("Custom Badge")).toHaveClass("test-class");
  });
});
