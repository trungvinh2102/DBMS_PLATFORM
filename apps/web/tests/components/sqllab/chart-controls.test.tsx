/**
 * @file chart-controls.test.tsx
 * @description Unit tests for ChartAxisControls component verifying axis selection behavior and value change handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import userEvent from "@testing-library/user-event";
import { ChartAxisControls } from "@/app/sqllab/components/ChartControls";

let capturedOnValueChange: ((val: any) => void) | undefined;

vi.mock("@/components/ui/select", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/select")>();
  return {
    ...actual,
    Select: ({
      children,
      onValueChange,
      ...props
    }: {
      children?: React.ReactNode;
      onValueChange?: (val: any) => void;
      [key: string]: any;
    }) => {
      capturedOnValueChange = onValueChange;
      return (
        <actual.Select onValueChange={onValueChange} {...props}>
          {children}
        </actual.Select>
      );
    },
  };
});

describe("ChartAxisControls", () => {
  beforeEach(() => {
    capturedOnValueChange = undefined;
  });

  it("renders trigger and allows selecting an x-axis key", async () => {
    const user = userEvent.setup();
    const setXAxisKey = vi.fn();
    const setYAxisKeys = vi.fn();

    render(
      <ChartAxisControls
        columns={["id", "name", "revenue"]}
        numericColumns={["revenue"]}
        xAxisKey="id"
        setXAxisKey={setXAxisKey}
        yAxisKeys={["revenue"]}
        setYAxisKeys={setYAxisKeys}
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();

    fireEvent.click(trigger);

    const nameOption = await screen.findByRole("option", { name: "name" });
    expect(nameOption).toBeInTheDocument();

    await user.click(nameOption);

    await waitFor(() => {
      expect(setXAxisKey).toHaveBeenCalledWith("name");
    });
  });

  it("does not call setXAxisKey when value change is empty or null, but calls it for nonempty string", () => {
    const setXAxisKey = vi.fn();
    const setYAxisKeys = vi.fn();

    render(
      <ChartAxisControls
        columns={["id", "name"]}
        numericColumns={[]}
        xAxisKey="id"
        setXAxisKey={setXAxisKey}
        yAxisKeys={[]}
        setYAxisKeys={setYAxisKeys}
      />,
    );

    expect(capturedOnValueChange).toBeDefined();

    // Regression: invoke with null -> zero calls
    capturedOnValueChange?.(null);
    expect(setXAxisKey).not.toHaveBeenCalled();

    // Regression: invoke with "" -> zero calls
    capturedOnValueChange?.("");
    expect(setXAxisKey).not.toHaveBeenCalled();

    // Regression: invoke with valid nonempty string -> exactly once
    capturedOnValueChange?.("name");
    expect(setXAxisKey).toHaveBeenCalledTimes(1);
    expect(setXAxisKey).toHaveBeenCalledWith("name");
  });
});



