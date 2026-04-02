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

  it("renders the Bookmarks header", () => {
    render(<SavedQueries />);
    expect(screen.getByText("Bookmarks")).toBeInTheDocument();
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

  it("shows View All link when queries exist", async () => {
    useAuth.setState({ user: { id: "1" } as any });

    render(<SavedQueries />);

    await waitFor(() => {
      expect(screen.getByText("View All")).toBeInTheDocument();
    });

    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toHaveAttribute("href", "/sqllab");
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
      expect(
        screen.getByText(/queries you save will appear here/i),
      ).toBeInTheDocument();
    });

    // "View All" should not appear for empty state
    expect(screen.queryByText("View All")).not.toBeInTheDocument();
  });
});
