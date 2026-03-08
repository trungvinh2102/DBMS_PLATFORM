import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test-utils";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

describe("ProtectedRoute", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
  });

  it("shows loading spinner when not authenticated", () => {
    useAuth.setState({ user: null, token: null });
    const { container } = render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>,
    );

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    useAuth.setState({ user: null, token: null });
    render(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>,
    );

    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });

  it("renders children when authenticated", () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        role: "admin",
      },
      token: "valid-token",
    });

    render(
      <ProtectedRoute>
        <div data-testid="secret">Secret Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId("secret")).toBeInTheDocument();
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });

  it("redirects to unauthorized when role is not allowed", () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        role: "user", // Not admin
      },
      token: "valid-token",
    });

    render(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Only</div>
      </ProtectedRoute>,
    );

    expect(mockPush).toHaveBeenCalledWith("/unauthorized");
    expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
  });
});
