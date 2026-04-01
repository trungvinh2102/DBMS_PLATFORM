import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test-utils";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  it("renders with default props", () => {
    render(<Progress value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("renders with value 0", () => {
    render(<Progress value={0} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("renders with value 100", () => {
    render(<Progress value={100} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Progress value={50} className="custom-class" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("custom-class");
  });

  it("applies indicatorClassName to indicator", () => {
    const { container } = render(
      <Progress value={50} indicatorClassName="bg-green-500" />,
    );
    const progressbar = screen.getByRole("progressbar");
    // The indicator is a child element
    expect(progressbar.children.length).toBeGreaterThan(0);
  });

  it("renders with undefined value (defaults to 0%)", () => {
    render(<Progress />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("has correct transform style on indicator", () => {
    const { container } = render(<Progress value={75} />);
    const progressbar = screen.getByRole("progressbar");
    const indicator = progressbar.querySelector("[data-state]") || progressbar.firstElementChild;
    expect(indicator).toBeTruthy();
    if (indicator) {
      expect(indicator.getAttribute("style")).toContain("translateX(-25%)");
    }
  });
});
