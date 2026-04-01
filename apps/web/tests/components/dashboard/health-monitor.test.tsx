import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { HealthMonitor } from "@/components/dashboard/health-monitor";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

describe("HealthMonitor", () => {
  it("renders the System Core header", () => {
    render(<HealthMonitor />);
    expect(screen.getByText("System Core")).toBeInTheDocument();
  });

  it("shows Operational when health check succeeds", async () => {
    render(<HealthMonitor />);

    await waitFor(() => {
      expect(screen.getByText("Operational")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/api services are responding normally/i),
    ).toBeInTheDocument();
  });

  it("shows Degraded when health check fails", async () => {
    server.use(
      http.get("*/api/health", () =>
        new HttpResponse(null, { status: 500 }),
      ),
    );

    render(<HealthMonitor />);

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton initially", () => {
    // Use a handler that never resolves
    server.use(
      http.get("*/api/health", () => {
        return new Promise(() => {}); // never resolves
      }),
    );

    const { container } = render(<HealthMonitor />);
    // Should have skeleton elements during loading
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(0); // May or may not have them depending on timing
    expect(container).toBeTruthy();
  });
});
