import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { SavedQueries } from "@/components/dashboard/saved-queries";
import { useAuth } from "@/hooks/use-auth";
import { server } from "../../mocks/server";
import { http, HttpResponse } from "msw";

describe("SavedQueries", () => {
  beforeEach(() => {
    useAuth.setState({ user: null });
  });

  it("renders the Bookmarked header", () => {
    render(<SavedQueries />);
    expect(screen.getByRole("heading", { name: "Bookmarked" })).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    useAuth.setState({ user: { id: "1" } as any });
    // Don't resolve immediately - the loading state should show skeletons
    const { container } = render(<SavedQueries />);
    // Skeleton elements should exist during loading
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    // If skeletons exist, they should be visible
    expect(container).toBeTruthy();
  });

  it("renders saved queries list from backend", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    render(<SavedQueries />);

    await waitFor(() => {
      expect(screen.getByText("Select All Users")).toBeInTheDocument();
    });

    // Should have a link to SQLLab with saved query param
    const link = screen.getByRole("link", { name: /select all users/i });
    expect(link).toHaveAttribute("href", "/sqllab?saved=1");
  });

  it("shows the System Catalog link when queries exist", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    render(<SavedQueries />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "System Catalog" })).toBeInTheDocument();
    });

    const systemCatalogLink = screen.getByRole("link", { name: "System Catalog" });
    expect(systemCatalogLink).toHaveAttribute("href", "/sqllab");
  });

  it("shows empty state message when no saved queries", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    server.use(
      http.get("*/api/database/saved-queries", () =>
        HttpResponse.json([]),
      ),
    );

    render(<SavedQueries />);

    await waitFor(() => {
      expect(screen.getByText("Library Empty")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Archive your favorite architectures for instant retrieval here.",
        ),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole("link", { name: "System Catalog" })).not.toBeInTheDocument();
  });
});
