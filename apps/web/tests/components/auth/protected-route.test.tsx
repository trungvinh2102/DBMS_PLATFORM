import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.setState({ user: null });
  });

  it("shows loading spinner when not authenticated", () => {
    const { container } = render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>,
    );

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("redirects to login when not authenticated", async () => {
    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", { replace: true });
    });
  });

  it("renders children when authenticated", () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        avatarUrl: null,
        bio: null,
        role: "admin",
      },
    });

    render(
      <ProtectedRoute>
        <div data-testid="secret">Secret Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId("secret")).toBeInTheDocument();
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });

  it("redirects to unauthorized when role is not allowed", async () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        avatarUrl: null,
        bio: null,
        role: "user",
      },
    });

    render(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Only</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/unauthorized", { replace: true });
    });
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
  });

  it("renders children when user has the allowed role", () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "testuser",
        name: "Admin User",
        avatarUrl: null,
        bio: null,
        role: "admin",
      },
    });

    render(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div data-testid="admin">Admin Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId("admin")).toBeInTheDocument();
  });
});
