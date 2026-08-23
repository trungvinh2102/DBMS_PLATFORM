/**
 * @file ErrorPanel.test.tsx
 * @description Direct unit tests for ErrorPanel rendering, Tailwind class
 * mapping, and click/keyboard interaction behavior.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPanel from "./ErrorPanel";
import { MarkerSeverity, type ErrorPanelEntry } from "./types";

const makeError = (overrides: Partial<ErrorPanelEntry> = {}): ErrorPanelEntry => ({
  id: "e1",
  line: 3,
  column: 7,
  endLine: 3,
  endColumn: 12,
  message: "Unexpected token",
  severity: MarkerSeverity.Error,
  severityLabel: "Error",
  ...overrides,
});

describe("ErrorPanel", () => {
  it("renders title, count, and empty state", () => {
    render(<ErrorPanel errors={[]} />);

    expect(screen.getByText("Problems")).toBeInTheDocument();
    expect(screen.getByText("No problems")).toBeInTheDocument();
    expect(screen.getByText("No syntax errors detected")).toBeInTheDocument();
  });

  it("keeps the legacy #888 count color utility", () => {
    render(<ErrorPanel errors={[makeError()]} />);

    const count = screen.getByText("1 problem");
    expect(count).toHaveClass("text-[11px]");
    expect(count).toHaveClass("text-[#888]");
    expect(count).not.toHaveClass("text-gray-500");
  });

  it("maps each severity to its icon and label colors", () => {
    render(
      <ErrorPanel
        errors={[
          makeError({ id: "a", message: "m1", severity: MarkerSeverity.Error, severityLabel: "Error" }),
          makeError({ id: "b", message: "m2", severity: MarkerSeverity.Warning, severityLabel: "Warning" }),
          makeError({ id: "c", message: "m3", severity: MarkerSeverity.Info, severityLabel: "Info" }),
          makeError({ id: "d", message: "m4", severity: MarkerSeverity.Hint, severityLabel: "Hint" }),
        ]}
      />,
    );

    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(4);
    expect(rows[0].querySelector("span:first-child")).toHaveClass("text-red-400");
    expect(rows[0].lastElementChild).toHaveClass("bg-red-500/20", "text-red-400");
    expect(rows[1].querySelector("span:first-child")).toHaveClass("text-amber-400");
    expect(rows[1].lastElementChild).toHaveClass("bg-amber-500/20", "text-amber-400");
    expect(rows[2].querySelector("span:first-child")).toHaveClass("text-blue-400");
    expect(rows[2].lastElementChild).toHaveClass("bg-blue-500/20", "text-blue-400");
    expect(rows[3].querySelector("span:first-child")).toHaveClass("text-violet-400");
    expect(rows[3].lastElementChild).toHaveClass("bg-violet-500/20", "text-violet-400");
  });

  it("applies the direct maxHeight prop to the scrollable list container", () => {
    const { container } = render(<ErrorPanel errors={[makeError()]} maxHeight={90} />);

    const list = container.querySelector(".overflow-y-auto");
    expect(list).not.toBeNull();
    expect(list).toHaveStyle({ maxHeight: "90px" });
  });

  it("falls back to the default 150px maxHeight when the prop is omitted", () => {
    const { container } = render(<ErrorPanel errors={[makeError()]} />);

    const list = container.querySelector(".overflow-y-auto");
    expect(list).not.toBeNull();
    expect(list).toHaveStyle({ maxHeight: "150px" });
  });

  it("calls onErrorClick with the entry line and column on row click", async () => {
    const onErrorClick = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPanel errors={[makeError()]} onErrorClick={onErrorClick} />);

    await user.click(screen.getByRole("button"));

    expect(onErrorClick).toHaveBeenCalledTimes(1);
    expect(onErrorClick).toHaveBeenCalledWith(3, 7);
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ] as const)("calls onErrorClick once per %s keydown on a focused row", async (_name, keys) => {
    const onErrorClick = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPanel errors={[makeError()]} onErrorClick={onErrorClick} />);

    screen.getByRole("button").focus();
    await user.keyboard(keys);

    expect(onErrorClick).toHaveBeenCalledTimes(1);
    expect(onErrorClick).toHaveBeenCalledWith(3, 7);
  });
});
