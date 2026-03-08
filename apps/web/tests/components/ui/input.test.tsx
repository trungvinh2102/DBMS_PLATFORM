/**
 * @file input.test.tsx
 * @description Unit tests for the Input component, verifying field input behavior and states.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Input } from "@/components/ui/input";

describe("Input Component", () => {
  const PLACEHOLDER = "Enter search term";

  it("handles user typing correctly", async () => {
    const user = userEvent.setup();
    render(<Input placeholder={PLACEHOLDER} />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);

    await user.type(input, "query text");
    expect(input).toHaveValue("query text");
  });

  it("respects the disabled state", () => {
    render(<Input disabled placeholder="Disabled input" />);
    expect(screen.getByPlaceholderText("Disabled input")).toBeDisabled();
  });

  it("renders with custom className", () => {
    render(<Input className="border-red-500" placeholder="Red border" />);
    expect(screen.getByPlaceholderText("Red border")).toHaveClass(
      "border-red-500",
    );
  });
});
