import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/hooks/use-auth";

// Mock react-router-dom navigate and location
const mockNavigate = vi.fn();
let mockPathname = "/";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname, search: "", hash: "", state: null, key: "default" }),
  };
});

describe("AuthGuard", () => {
  beforeEach(() => {
    useAuth.setState({ token: null, user: null });
    mockNavigate.mockClear();
    mockPathname = "/";
  });

  it("renders children", () => {
    render(
      <AuthGuard>
        <div data-testid="child">Protected Content</div>
      </AuthGuard>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("redirects to login when no token on non-auth page", async () => {
    mockPathname = "/dashboard";
    useAuth.setState({ token: null, user: null });

    render(
      <AuthGuard>
        <div>Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", { replace: true });
    });
  });

  it("redirects to home when token exists on auth page", async () => {
    mockPathname = "/auth/login";
    useAuth.setState({ token: "mock-token", user: { id: "1" } as any });

    render(
      <AuthGuard>
        <div>Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("does not redirect when token exists on non-auth page", async () => {
    mockPathname = "/dashboard";
    useAuth.setState({ token: "mock-token", user: { id: "1" } as any });

    render(
      <AuthGuard>
        <div data-testid="child">Content</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not redirect when no token on auth page", async () => {
    mockPathname = "/auth/register";
    useAuth.setState({ token: null, user: null });

    render(
      <AuthGuard>
        <div data-testid="child">Content</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
