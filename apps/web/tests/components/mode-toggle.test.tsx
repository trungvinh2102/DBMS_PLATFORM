import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../test-utils";
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

  it("renders and calls setTheme for all 3 themes", async () => {
    const user = userEvent.setup();
    const { setTheme } = mockedUseTheme();
    render(<ModeToggle />);
    const trigger = screen.getByRole("button", { name: /toggle theme/i });

    // Dark
    await user.click(trigger);
    await user.click(await screen.findByText("Dark"));
    expect(setTheme).toHaveBeenCalledWith("dark");

    // Light
    await user.click(trigger);
    await user.click(await screen.findByText("Light"));
    expect(setTheme).toHaveBeenCalledWith("light");

    // System
    await user.click(trigger);
    await user.click(await screen.findByText("System"));
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("syncs theme to backend", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(userApi, "updateSettings");
    useAuth.setState({
      user: { id: "1", email: "test@example.com", name: "Test" } as any,
      token: "mock-token",
    });

    render(<ModeToggle />);

    await waitFor(
      async () => {
        const trigger = screen.getByRole("button", { name: /toggle theme/i });
        await user.click(trigger);
        const dark = screen.queryByText("Dark");
        if (!dark) throw new Error("not open");
        await user.click(dark);
        expect(updateSpy).toHaveBeenCalled();
      },
      { timeout: 8000 },
    );
  });

  it("handles empty settings merge and mutation error", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock settings as null to hit 'settings || {}' branch (line 50)
    server.use(
      http.get("*/api/user/settings", () => HttpResponse.json(null)),
      http.post(
        "*/api/user/settings",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    useAuth.setState({
      user: { id: "1", email: "test@example.com", name: "Test" } as any,
      token: "mock-token",
    });

    render(<ModeToggle />);

    await waitFor(
      async () => {
        const trigger = screen.getByRole("button", { name: /toggle theme/i });
        await user.click(trigger);
        const dark = screen.queryByText("Dark");
        if (!dark) throw new Error("not open");
        await user.click(dark);
        expect(consoleSpy).toHaveBeenCalled();
      },
      { timeout: 8000 },
    );

    consoleSpy.mockRestore();
  });
});
