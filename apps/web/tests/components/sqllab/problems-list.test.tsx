/**
 * @file problems-list.test.tsx
 * @description Focused coverage for the SQL Lab Problems list rows and the
 * results footer problem counters.
 */

import { fireEvent, render } from "../../test-utils";
import { describe, expect, it, vi } from "vitest";

import { ProblemsList } from "@/app/sqllab/components/ProblemsList";
import { ResultFooter } from "@/app/sqllab/components/results/ResultFooter";

vi.mock("@/app/sqllab/context/SQLLabContext", () => ({
  useSQLLabCursorContext: () => ({ cursorPos: { lineNumber: 1, column: 1 } }),
}));

const expectedFromError = {
  id: "error-2-8",
  line: 2,
  column: 8,
  endLine: 2,
  endColumn: 12,
  message: "Expected FROM",
  severity: 8,
  severityLabel: "Error",
};

const unexpectedTokenError = {
  id: "error-4-12",
  line: 4,
  column: 12,
  endLine: 4,
  endColumn: 13,
  message: "Unexpected token",
  severity: 8,
  severityLabel: "Error",
};

describe("ProblemsList", () => {
  it("renders the location, exact message, and severity for a diagnostic", () => {
    const view = render(<ProblemsList errors={[expectedFromError]} />);

    expect(view.getByText("[2:8]")).toBeInTheDocument();
    expect(view.getByText("Expected FROM")).toBeInTheDocument();
    expect(view.getByText("Error")).toBeInTheDocument();
    expect(view.container.querySelector(".lucide-circle-x")).toBeInTheDocument();
  });

  it("activates a row once per click and supports repeated activation", () => {
    const onItemClick = vi.fn();
    const view = render(
      <ProblemsList errors={[unexpectedTokenError]} onItemClick={onItemClick} />,
    );
    const row = view.getByRole("button", { name: /4:12/ });

    fireEvent.click(row);
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenLastCalledWith(4, 12);

    fireEvent.click(row);
    expect(onItemClick).toHaveBeenCalledTimes(2);
    expect(onItemClick).toHaveBeenLastCalledWith(4, 12);
  });

  it("activates a row with Enter and Space key presses", () => {
    const onItemClick = vi.fn();
    const view = render(
      <ProblemsList errors={[unexpectedTokenError]} onItemClick={onItemClick} />,
    );
    const row = view.getByRole("button", { name: /4:12/ });

    fireEvent.keyDown(row, { key: "Enter" });
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenLastCalledWith(4, 12);

    fireEvent.keyDown(row, { key: " " });
    expect(onItemClick).toHaveBeenCalledTimes(2);
    expect(onItemClick).toHaveBeenLastCalledWith(4, 12);
  });

  it("keeps the No Problems empty state when there are no diagnostics", () => {
    const onItemClick = vi.fn();
    const view = render(<ProblemsList errors={[]} onItemClick={onItemClick} />);

    expect(view.getByText("No Problems")).toBeInTheDocument();
    expect(view.queryByRole("button")).not.toBeInTheDocument();
    expect(onItemClick).not.toHaveBeenCalled();
  });
});

describe("ResultFooter problem counters", () => {
  it("shows no error or warning counter when there are no problems", () => {
    const setActiveTab = vi.fn();
    const view = render(
      <ResultFooter
        tabSize={4}
        errorCount={0}
        warningCount={0}
        setActiveTab={setActiveTab}
        encoding="UTF-8"
      />,
    );

    expect(view.queryByRole("button")).not.toBeInTheDocument();
    expect(setActiveTab).not.toHaveBeenCalled();
    expect(view.getByText("LN 1, COL 1")).toBeInTheDocument();
  });
});
