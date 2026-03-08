import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  it("renders Checkbox correctly", () => {
    render(<Checkbox id="checkbox-test" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("can be disabled", () => {
    render(<Checkbox disabled id="disabled-check" />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("aria-disabled", "true");
  });
});
