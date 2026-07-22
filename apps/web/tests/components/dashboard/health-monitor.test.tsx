import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { HealthMonitor } from "@/components/dashboard/health-monitor";

describe("HealthMonitor", () => {
  it("renders the health header", () => {
    render(<HealthMonitor />);
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("shows the operational fallback status", async () => {
    render(<HealthMonitor />);

    await waitFor(() => {
      expect(screen.getByText(/Operational/i)).toBeInTheDocument();
    });
  });

  it("renders a local radial score without Recharts markup", async () => {
    const { container } = render(<HealthMonitor />);

    await waitFor(() => {
      expect(container.querySelector("[data-testid='radial-score']")).toBeInTheDocument();
    });
    expect(container.querySelector(".recharts-wrapper")).not.toBeInTheDocument();
  });
});
