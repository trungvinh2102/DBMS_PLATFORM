/**
 * @file textarea.test.tsx
 * @description Unit tests for the Textarea component, validating input handling and attributes.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea Component", () => {
  const PLACEHOLDER = "Type some message here";

  it("correctly handles multi-line input", async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder={PLACEHOLDER} />);
    const textarea = screen.getByPlaceholderText(PLACEHOLDER);

    await user.type(textarea, "Hello\nWorld");
    expect(textarea).toHaveValue("Hello\nWorld");
  });

  it("remains disabled when prop is enabled", () => {
    render(<Textarea disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("applies default styling classes", () => {
    render(<Textarea placeholder="Styled" />);
    expect(screen.getByPlaceholderText("Styled")).toHaveClass("min-h-[80px]");
  });
});
