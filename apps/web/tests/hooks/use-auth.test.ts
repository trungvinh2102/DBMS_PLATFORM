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
    useAuth.setState({ token: null, user: null });
    vi.clearAllMocks();
  });

  it("should initialize with null values", () => {
    const state = useAuth.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it("should set authentication state and cookie", () => {
    const token = "mock-token";
    useAuth.getState().setAuth(token, mockUser);

    expect(useAuth.getState().token).toBe(token);
    expect(useAuth.getState().user).toEqual(mockUser);
    expect(setCookie).toHaveBeenCalledWith(
      "auth-token",
      token,
      expect.any(Object),
    );
  });

  it("should update user profile", () => {
    const updatedUser = { ...mockUser, name: "Updated Name" };
    useAuth.getState().setUser(updatedUser);

    expect(useAuth.getState().user).toEqual(updatedUser);
  });

  it("should clear state and delete cookie on logout", () => {
    useAuth.getState().setAuth("token", mockUser);
    useAuth.getState().logout();

    expect(useAuth.getState().token).toBeNull();
    expect(useAuth.getState().user).toBeNull();
    expect(deleteCookie).toHaveBeenCalledWith("auth-token");
  });
  it("should catch config errors when setting cookie fails", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (setCookie as any).mockImplementationOnce(() => {
      throw new Error("Cookie error");
    });

    useAuth.getState().setAuth("token", mockUser);

    expect(consoleSpy).toHaveBeenCalledWith(
      "useAuth: setCookie failed",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
