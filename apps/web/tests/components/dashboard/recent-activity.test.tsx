import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { useAuth } from "@/hooks/use-auth";

describe("RecentActivity", () => {
  it("renders list of recent queries", async () => {
    useAuth.setState({ user: { id: "1" } as any });
    render(<RecentActivity />);

    expect(screen.getByText("Recent Activity")).toBeInTheDocument();

    await waitFor(() => {
      // Mock history from MSW
      expect(screen.getByText(/SELECT \* FROM products/i)).toBeInTheDocument();
      expect(
        screen.getByText(/UPDATE users SET active = true/i),
      ).toBeInTheDocument();
    });
  });

  it("renders header", () => {
    render(<RecentActivity />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });
});
