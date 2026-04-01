import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "../test-utils";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import userEvent from "@testing-library/user-event";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("Header", () => {
  beforeEach(() => {
    useAuth.setState({ user: null, token: null });
    server.use(
      http.get("*/api/user/settings", () =>
        HttpResponse.json({ theme: "light" }),
      ),
    );
  });

  it("renders sign in link when not logged in", () => {
    render(<Header />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<Header />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.getByText("SQL Lab")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders DBMS branding", () => {
    render(<Header />);
    expect(screen.getByText("DBMS")).toBeInTheDocument();
  });

  it("renders user avatar when logged in", async () => {
    act(() => {
      useAuth.setState({
        user: {
          id: "1",
          email: "test@example.com",
          username: "testuser",
          name: "John Doe",
          avatarUrl: null,
          bio: null,
          role: "admin",
        },
        token: "mock-token",
      });
    });

    render(<Header />);
    expect(await screen.findByText("JD")).toBeInTheDocument();
  });

  it("renders email fallback when name is empty", async () => {
    act(() => {
      useAuth.setState({
        user: {
          id: "1",
          email: "test@example.com",
          username: "testuser",
          name: "",
          avatarUrl: null,
          bio: null,
          role: "admin",
        },
        token: "mock-token",
      });
    });

    render(<Header />);
    expect(await screen.findByText("TE")).toBeInTheDocument();
  });

  it("does not render on auth pages", () => {
    const { container } = render(<Header />, {
      routerProps: { initialEntries: ["/auth/login"] },
    });
    expect(container.firstChild).toBeNull();
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
