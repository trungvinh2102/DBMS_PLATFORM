import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { useAuth } from "@/hooks/use-auth";

describe("DashboardStats", () => {
  it("renders stats cards correctly", async () => {
    useAuth.setState({ token: "mock-token", user: { id: "1" } as any });
    render(<DashboardStats />);

    expect(screen.getByText("Total Connections")).toBeInTheDocument();
    expect(screen.getByText("Saved Queries")).toBeInTheDocument();
    expect(screen.getByText("System Status")).toBeInTheDocument();

    // Wait for data to load from MSW mocks
    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument(); // 2 connections from mock
      expect(screen.getByText("1")).toBeInTheDocument(); // 1 saved query from mock
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
  });
});
