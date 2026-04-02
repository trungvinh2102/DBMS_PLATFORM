import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { ConnectionOverview } from "@/components/dashboard/connection-overview";
import { useAuth } from "@/hooks/use-auth";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

describe("ConnectionOverview", () => {
  beforeEach(() => {
    useAuth.setState({ user: null });
  });

  it("renders the Connections header", () => {
    useAuth.setState({ user: { id: "1" } as any });
    render(<ConnectionOverview />);
    expect(screen.getByText("Connections")).toBeInTheDocument();
  });

  it("shows connection count when databases exist", async () => {
    useAuth.setState({ user: { id: "1" } as any });
    render(<ConnectionOverview />);

    await waitFor(() => {
      expect(screen.getByText("Active Workspaces")).toBeInTheDocument();
    });
  });

  it("shows 'No connections yet' when no databases", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    server.use(
      http.get("*/api/database/list", () => HttpResponse.json([])),
    );

    render(<ConnectionOverview />);

    await waitFor(() => {
      expect(screen.getByText("No connections yet")).toBeInTheDocument();
      expect(
        screen.getByText(/connect your first database/i),
      ).toBeInTheDocument();
    });

    // Should have an "Add Connection" link
    const addLink = screen.getByRole("link", { name: /add connection/i });
    expect(addLink).toHaveAttribute("href", "/connections");
  });

  it("shows zero count when value is 0", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    server.use(
      http.get("*/api/database/list", () => HttpResponse.json([])),
    );

    render(<ConnectionOverview />);

    await waitFor(() => {
      expect(screen.getByText("No connections yet")).toBeInTheDocument();
    });
  });
});
