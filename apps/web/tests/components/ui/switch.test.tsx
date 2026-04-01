import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test-utils";
import { Switch } from "@/components/ui/switch";
import userEvent from "@testing-library/user-event";

describe("Switch", () => {
  it("renders correctly", () => {
    render(<Switch data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl).toBeInTheDocument();
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch onCheckedChange={handleChange} data-testid="switch" />);

    const switchEl = screen.getByTestId("switch");
    await user.click(switchEl);

    expect(handleChange).toHaveBeenCalled();
  });

  it("reflects checked state", () => {
    render(<Switch checked={true} data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl).toHaveAttribute("data-checked", "");
  });

  it("reflects unchecked state", () => {
    render(<Switch checked={false} data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl).toHaveAttribute("data-unchecked", "");
  });

  it("applies custom className", () => {
    render(<Switch className="custom-switch" data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    expect(switchEl.className).toContain("custom-switch");
  });

  it("renders the thumb element", () => {
    const { container } = render(<Switch data-testid="switch" />);
    const thumb = container.querySelector("span span") || container.querySelector("[data-slot]");
    expect(thumb).toBeTruthy();
  });

  it("marks as aria-disabled when disabled", () => {
    render(<Switch disabled data-testid="switch" />);
    const switchEl = screen.getByTestId("switch");
    // Base UI Switch uses aria-disabled and data-disabled, not the HTML disabled attribute
    expect(switchEl).toHaveAttribute("aria-disabled", "true");
    expect(switchEl).toHaveAttribute("data-disabled", "");
  });
});
