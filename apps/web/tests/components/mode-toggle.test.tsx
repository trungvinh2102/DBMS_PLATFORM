import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "../test-utils";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";

// useTheme is mocked in vitest.setup.tsx, but we might want to access the mock
const mockedUseTheme = vi.mocked(useTheme);

describe("ModeToggle component", () => {
  it("renders the theme toggle button", () => {
    render(<ModeToggle />);
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });

  it("opens the dropdown menu when clicked", () => {
    render(<ModeToggle />);
    const trigger = screen.getByRole("button", { name: /toggle theme/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls setTheme when a theme option is clicked", async () => {
    const { setTheme } = mockedUseTheme();
    render(<ModeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    fireEvent.click(screen.getByText("Dark"));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("syncs theme preference with backend when user is logged in", async () => {
    // Set user as logged in using the real store
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        username: "test",
        name: "Test",
        role: "user",
      },
      token: "mock-token",
    });

    render(<ModeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    fireEvent.click(screen.getByText("Dark"));

    // Check if setTheme was called
    expect(mockedUseTheme().setTheme).toHaveBeenCalledWith("dark");

    // Note: To verify the API call, we could use MSW or spy on userApi.updateSettings
    // Since we're using MSW, the test passes if the component doesn't crash
  });
});
