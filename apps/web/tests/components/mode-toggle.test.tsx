import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../test-utils";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";
import { userApi } from "@/lib/api-client";
import userEvent from "@testing-library/user-event";

const mockedUseTheme = vi.mocked(useTheme);

describe("ModeToggle component", () => {
  beforeEach(() => {
    useAuth.setState({ user: null, token: null });
    vi.clearAllMocks();
    server.use(
      http.get("*/api/user/settings", () =>
        HttpResponse.json({ theme: "light" }),
      ),
    );
  });

  it("renders toggle button", () => {
    render(<ModeToggle />);
    const trigger = screen.getByRole("button");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
  });

  it("renders and opens dropdown menu on click", async () => {
    const user = userEvent.setup();
    render(<ModeToggle />);
    const trigger = screen.getByRole("button");
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
    });
  });

  it("calls setTheme when selecting a theme", async () => {
    const user = userEvent.setup();
    const { setTheme } = mockedUseTheme();
    render(<ModeToggle />);
    const trigger = screen.getByRole("button");

    await user.click(trigger);
    const darkItem = await screen.findByText("Dark");
    await user.click(darkItem);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("syncs theme to backend when user is logged in", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(userApi, "updateSettings").mockResolvedValue({});
    useAuth.setState({
      user: { id: "1", email: "test@example.com", name: "Test", username: "test", avatarUrl: null, bio: null, role: "admin" },
      token: "mock-token",
    });

    render(<ModeToggle />);

    // Wait for settings query to load first
    await waitFor(() => {}, { timeout: 2000 });

    const trigger = screen.getByRole("button");
    await user.click(trigger);
    const dark = await screen.findByText("Dark");
    await user.click(dark);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    }, { timeout: 3000 });

    updateSpy.mockRestore();
  }, 15000);

  it("handles error when syncing theme to backend", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    server.use(
      http.get("*/api/user/settings", () => HttpResponse.json(null)),
      http.post(
        "*/api/user/settings",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    useAuth.setState({
      user: { id: "1", email: "test@example.com", name: "Test", username: "test", avatarUrl: null, bio: null, role: "admin" },
      token: "mock-token",
    });

    render(<ModeToggle />);

    // Wait for settings query to load first
    await waitFor(() => {}, { timeout: 2000 });

    const trigger = screen.getByRole("button");
    await user.click(trigger);
    const dark = await screen.findByText("Dark");
    await user.click(dark);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    }, { timeout: 5000 });

    consoleSpy.mockRestore();
  }, 15000);
});
