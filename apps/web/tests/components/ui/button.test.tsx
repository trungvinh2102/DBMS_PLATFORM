/**
 * @file button.test.tsx
 * @description Unit tests for the Button component, covering variants, sizes, and states.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  const BUTTON_TEXT = "Click Me";

  it("renders correctly with children text", () => {
    render(<Button>{BUTTON_TEXT}</Button>);
    expect(
      screen.getByRole("button", { name: new RegExp(BUTTON_TEXT, "i") }),
    ).toBeInTheDocument();
  });

  it("renders as a slot when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/">Link Button</a>
      </Button>,
    );
    expect(
      screen.getByRole("link", { name: /link button/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("applies variant classes correctly", () => {
    const { rerender } = render(
      <Button variant="destructive">{BUTTON_TEXT}</Button>,
    );
    let button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");

    rerender(<Button variant="outline">{BUTTON_TEXT}</Button>);
    button = screen.getByRole("button");
    expect(button).toHaveClass("border-input");
  });

  it("applies size classes correctly", () => {
    render(<Button size="sm">{BUTTON_TEXT}</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-9");
  });

  it("is disabled when the disabled prop is passed", () => {
    render(<Button disabled>{BUTTON_TEXT}</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls onClick handler when clicked", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>{BUTTON_TEXT}</Button>);

    screen.getByRole("button").click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
