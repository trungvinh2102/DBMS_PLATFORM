import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../test-utils";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";

describe("Header", () => {
  it("renders sign in button when not logged in", () => {
    useAuth.setState({ user: null, token: null });
    render(<Header />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders user avatar when logged in", async () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        role: "admin",
      },
      token: "mock-token",
    });
    render(<Header />);
    // Avatar shows initials or fallback
    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("does not render on auth pages", () => {
    vi.mocked(usePathname).mockReturnValue("/auth/login");
    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });
});
