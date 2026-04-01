import { describe, it, expect } from "vitest";
import { render, screen } from "../../test-utils";
import { QuickActions } from "@/components/dashboard/quick-actions";

describe("QuickActions", () => {
  it("renders quick action tiles with correct links", () => {
    render(<QuickActions />);

    // Component renders "SQL Lab" and "New DB"
    expect(screen.getByText("SQL Lab")).toBeInTheDocument();
    expect(screen.getByText("New DB")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    const sqlLabLink = links.find((l) => l.getAttribute("href") === "/sqllab");
    const connectionsLink = links.find((l) => l.getAttribute("href") === "/connections");

    expect(sqlLabLink).toBeDefined();
    expect(connectionsLink).toBeDefined();
  });

  it("renders icon containers", () => {
    const { container } = render(<QuickActions />);
    // Should have 2 icon containers (circles)
    const iconContainers = container.querySelectorAll(".rounded-full");
    expect(iconContainers.length).toBeGreaterThanOrEqual(2);
  });
});
