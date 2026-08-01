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

  it("renders the Connectivity header", () => {
    useAuth.setState({ user: { id: "1" } as any });
    render(<ConnectionOverview />);
    expect(screen.getByRole("heading", { name: "Connectivity" })).toBeInTheDocument();
  });

  it("shows connection count when databases exist", async () => {
    useAuth.setState({ user: { id: "1" } as any });
    render(<ConnectionOverview />);

    await waitFor(() => {
      expect(screen.getByText("2 Active Connections")).toBeInTheDocument();
    });
  });

  it("shows the pending architecture empty state when no databases", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    server.use(
      http.get("*/api/database/list", () => HttpResponse.json([])),
    );

    render(<ConnectionOverview />);

    await waitFor(() => {
      expect(screen.getByText("Architecture Pending")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Initialize your first analytical pipeline by connecting a data source.",
        ),
      ).toBeInTheDocument();
    });

    const addLink = screen.getByRole("link", { name: "Add Asset" });
    expect(addLink).toHaveAttribute("href", "/connections");
  });

  it("shows zero count when value is 0", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    server.use(
      http.get("*/api/database/list", () => HttpResponse.json([])),
    );

    render(<ConnectionOverview />);

    await waitFor(() => {
      expect(screen.getByText("Architecture Pending")).toBeInTheDocument();
    });
  });
});
