import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test-utils";
import { HeroAI } from "@/components/dashboard/hero-ai";
import { useAuth } from "@/hooks/use-auth";

describe("HeroAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.setState({ user: null });
  });

  it("renders greeting based on time of day", () => {
    render(<HeroAI />);
    const greeting = screen.getByRole("heading", { level: 1 });
    expect(greeting).toBeInTheDocument();
    expect(greeting.textContent).toMatch(
      /good morning|good afternoon|good evening/i,
    );
  });

  it("renders user first name when authenticated", () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        name: "Jane Smith",
        username: "janesmith",
        avatarUrl: null,
        bio: null,
        role: "admin",
      },
    });

    render(<HeroAI />);
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("shows 'Developer' as fallback when no user name", () => {
    useAuth.setState({
      user: {
        id: "1",
        email: "test@example.com",
        name: null,
        username: "test",
        avatarUrl: null,
        bio: null,
        role: "admin",
      },
    });

    render(<HeroAI />);
    expect(screen.getByText("Developer")).toBeInTheDocument();
  });

  it("renders the tagline question", () => {
    render(<HeroAI />);
    expect(
      screen.getByText(/what would you like to build or analyze today/i),
    ).toBeInTheDocument();
  });

  it("renders good morning before noon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T08:00:00"));

    render(<HeroAI />);
    expect(screen.getByText(/good morning/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders good afternoon between noon and 6pm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T14:00:00"));

    render(<HeroAI />);
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders good evening after 6pm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T20:00:00"));

    render(<HeroAI />);
    expect(screen.getByText(/good evening/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("does not render AI prompt input, placeholder, or keyboard shortcut hint", () => {
    render(<HeroAI />);
    expect(
      screen.queryByPlaceholderText(/ask ai to write sql/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByText("K")).not.toBeInTheDocument();
  });
});
