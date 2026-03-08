import { describe, it, expect } from "vitest";
import { render, screen } from "../../test-utils";
import { QuickActions } from "@/components/dashboard/quick-actions";

describe("QuickActions", () => {
  it("renders quick action buttons with links", () => {
    render(<QuickActions />);

    expect(screen.getByText("Open SQL Lab")).toBeInTheDocument();
    expect(screen.getByText("New Connection")).toBeInTheDocument();

    const sqlLabLink = screen.getByRole("link", { name: /open sql lab/i });
    expect(sqlLabLink).toHaveAttribute("href", "/sqllab");

    const newConnLink = screen.getByRole("link", { name: /new connection/i });
    expect(newConnLink).toHaveAttribute("href", "/connections");
  });
});
