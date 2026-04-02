import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { setCookie, deleteCookie } from "cookies-next";

// Mock cookies-next
vi.mock("cookies-next", () => ({
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

describe("useAuth hook/store", () => {
  const mockUser = {
    id: "1",
    email: "test@example.com",
    username: "testuser",
    name: "Test User",
    role: "admin",
    avatarUrl: null,
    bio: null,
  };

  beforeEach(() => {
    // Reset Zustand state
    useAuth.setState({ user: null });
    vi.clearAllMocks();
  });

  it("should initialize with null values", () => {
    const state = useAuth.getState();
    expect(state.user).toBeNull();
  });

  it("should set authentication state", () => {
    useAuth.getState().setAuth(mockUser);

    expect(useAuth.getState().user).toEqual(mockUser);
  });

  it("should update user profile", () => {
    const updatedUser = { ...mockUser, name: "Updated Name" };
    useAuth.getState().setUser(updatedUser);

    expect(useAuth.getState().user).toEqual(updatedUser);
  });

  it("should clear state on logout", () => {
    useAuth.getState().setAuth(mockUser);
    useAuth.getState().logout();

    expect(useAuth.getState().user).toBeNull();
  });
});

