import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "../test-utils";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import userEvent from "@testing-library/user-event";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("Header", () => {
  beforeEach(() => {
    useAuth.setState({ user: null, token: null });
    vi.mocked(usePathname).mockReturnValue("/");
    server.use(
      http.get("*/api/user/settings", () =>
        HttpResponse.json({ theme: "light" }),
      ),
    );
  });

  it("renders sign in button when not logged in", () => {
    render(<Header />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders user avatar when logged in and handles name variations", async () => {
    const user = {
      id: "1",
      email: "test@example.com",
      username: "testuser",
      name: "John Doe",
      role: "admin",
    };

    // Use act for state updates that trigger re-renders
    act(() => {
      useAuth.setState({ user, token: "mock-token" });
    });

    const { rerender } = render(<Header />);
    expect(await screen.findByText("JD")).toBeInTheDocument();

    act(() => {
      useAuth.setState({ user: { ...user, name: "Single" } });
    });
    rerender(<Header />);
    expect(await screen.findByText("S")).toBeInTheDocument();

    act(() => {
      useAuth.setState({ user: { ...user, name: "" } });
    });
    rerender(<Header />);
    expect(await screen.findByText("TE")).toBeInTheDocument();
  });

  it("does not render on auth pages", () => {
    vi.mocked(usePathname).mockReturnValue("/auth/login");
    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it("handles logout", async () => {
    const userEv = userEvent.setup();
    act(() => {
      useAuth.setState({
        user: {
          id: "1",
          email: "test@example.com",
          username: "testuser",
          name: "Test User",
          role: "admin",
        },
        token: "token",
      });
    });

    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: "" } as any;

    render(<Header />);

    const avatarTrigger = await screen.findByText("TU");
    await userEv.click(avatarTrigger);

    const logoutButton = await screen.findByText("Log out");
    await userEv.click(logoutButton);

    await waitFor(() => {
      expect(useAuth.getState().user).toBeNull();
      expect(window.location.href).toBe("/auth/login");
    });

    window.location = originalLocation;
  });

  it("hydrates user when token exists but user is missing", async () => {
    act(() => {
      useAuth.setState({ user: null, token: "valid-token" });
    });

    render(<Header />);

    await waitFor(
      () => {
        const u = useAuth.getState().user;
        expect(u).not.toBeNull();
        expect(u?.email).toBe("test@example.com");
      },
      { timeout: 5000 },
    );
  });

  it("handles hydration error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    server.use(
      http.get("*/api/user/me", () => new HttpResponse(null, { status: 500 })),
    );

    act(() => {
      useAuth.setState({ user: null, token: "invalid-token" });
    });

    render(<Header />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch user profile:",
        expect.anything(),
      );
    });

    consoleSpy.mockRestore();
  });
});
