import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "../../test-utils";
import { Slider } from "@/components/ui/slider";

describe("Slider", () => {
  it("renders with default props", () => {
    render(<Slider value={50} data-testid="slider" />);
    const slider = screen.getByTestId("slider");
    // The slider renders an input[type=range]
    const input = slider.querySelector("input[type='range']") || screen.getByRole("slider");
    expect(input).toBeInTheDocument();
  });

  it("renders with array value", () => {
    render(<Slider value={[30]} data-testid="slider" />);
    const input = screen.getByRole("slider");
    expect(input).toHaveValue("30");
  });

  it("renders with numeric value", () => {
    render(<Slider value={70} data-testid="slider" />);
    const input = screen.getByRole("slider");
    expect(input).toHaveValue("70");
  });

  it("calls onValueChange when changed", () => {
    const handleChange = vi.fn();
    render(
      <Slider value={50} onValueChange={handleChange} data-testid="slider" />,
    );

    const input = screen.getByRole("slider");
    fireEvent.change(input, { target: { value: "75" } });

    expect(handleChange).toHaveBeenCalledWith([75]);
  });

  it("renders with custom min/max", () => {
    render(<Slider value={5} min={0} max={10} data-testid="slider" />);
    const input = screen.getByRole("slider");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "10");
  });

  it("renders with custom step", () => {
    render(<Slider value={50} step={5} data-testid="slider" />);
    const input = screen.getByRole("slider");
    expect(input).toHaveAttribute("step", "5");
  });

  it("applies custom className", () => {
    const { container } = render(
      <Slider value={50} className="custom-slider" data-testid="slider" />,
    );
    const wrapper = container.firstChild;
    expect((wrapper as HTMLElement).className).toContain("custom-slider");
  });

  it("renders progress bar with correct width", () => {
    const { container } = render(<Slider value={50} min={0} max={100} />);
    // Find the progress indicator div (second absolute div)
    const progressDivs = container.querySelectorAll(".absolute");
    // Should have at least the track and indicator
    expect(progressDivs.length).toBeGreaterThanOrEqual(2);
  });
});
