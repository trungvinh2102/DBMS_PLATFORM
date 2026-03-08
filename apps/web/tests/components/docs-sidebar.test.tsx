import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";

// Mock Next.js usePathname hook
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { DocsSidebarNav } from "@/components/docs-sidebar";
import { act } from "react";

describe("DocsSidebarNav", () => {
  const user = userEvent.setup();

  const mockItems = [
    {
      title: "Getting Started",
      items: [
        { title: "Introduction", href: "/docs/intro" },
        { title: "Installation", href: "/docs/install" },
        { title: "Disabled Page", href: "/docs/disabled", disabled: true },
      ],
    },
    {
      title: "Core Features",
      items: [
        { title: "Database", href: "/docs/database#setup" },
        { title: "AI Assistant", href: "/docs/ai" },
      ],
    },
  ];

  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/docs/intro");
    window.location.hash = "";
  });

  it("renders section titles and their icons", () => {
    render(<DocsSidebarNav items={mockItems} />);

    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Core Features")).toBeInTheDocument();

    // Lucide icons are <svg aria-hidden="true"> → no role="img"
    // → Query all <svg> inside the section headers instead
    const iconSVGs = screen
      .getAllByText(/Getting Started|Core Features/i)
      .map((titleEl) => titleEl.closest("div")?.querySelector("svg.lucide"));

    expect(iconSVGs).toHaveLength(2);
    iconSVGs.forEach((svg) => {
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("renders all items when section is expanded (default behavior)", () => {
    render(<DocsSidebarNav items={mockItems} />);

    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Installation")).toBeInTheDocument();
    expect(screen.getByText("Disabled Page")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("toggles section collapse / expand when clicking the header", async () => {
    render(<DocsSidebarNav items={mockItems} />);

    const header = screen.getByText("Getting Started");

    // Initially expanded → items are in the document
    expect(screen.getByText("Introduction")).toBeInTheDocument();

    await user.click(header);

    // After collapse → items are removed from DOM (conditional render)
    await waitFor(() => {
      expect(screen.queryByText("Introduction")).not.toBeInTheDocument();
      expect(screen.queryByText("Installation")).not.toBeInTheDocument();
    });

    // Expand again
    await user.click(header);

    await waitFor(() => {
      expect(screen.getByText("Introduction")).toBeInTheDocument();
      expect(screen.getByText("Installation")).toBeInTheDocument();
    });
  });

  it("highlights active item based on pathname (no hash)", () => {
    vi.mocked(usePathname).mockReturnValue("/docs/install");

    render(<DocsSidebarNav items={mockItems} />);

    const installLink = screen.getByText("Installation");
    expect(installLink).toHaveClass("bg-blue-50", "text-blue-600");

    const introLink = screen.getByText("Introduction");
    expect(introLink).not.toHaveClass("bg-blue-50");
  });

  it("highlights active item based on hash", () => {
    vi.mocked(usePathname).mockReturnValue("/docs/database");
    window.location.hash = "#setup";

    render(<DocsSidebarNav items={mockItems} />);

    const databaseLink = screen.getByText("Database");
    expect(databaseLink).toHaveClass("bg-blue-50", "text-blue-600");

    const aiLink = screen.getByText("AI Assistant");
    expect(aiLink).not.toHaveClass("bg-blue-50");
  });

  it("does not highlight item when pathname matches but hash exists", () => {
    vi.mocked(usePathname).mockReturnValue("/docs/intro");
    window.location.hash = "#somehash";

    render(<DocsSidebarNav items={mockItems} />);

    const introLink = screen.getByText("Introduction");
    expect(introLink).not.toHaveClass("bg-blue-50");
  });

  it("applies correct styles to disabled items", () => {
    render(<DocsSidebarNav items={mockItems} />);

    const disabledLink = screen.getByText("Disabled Page");

    expect(disabledLink).toHaveClass("pointer-events-none", "opacity-50");

    // If you want better a11y, add aria-disabled="true" to the <a> in the component:
    // <Link ... aria-disabled={item.disabled ? "true" : undefined} ... >
    //
    // Then you can uncomment:
    // expect(disabledLink).toHaveAttribute("aria-disabled", "true");
    //
    // For now we skip the aria check since it's not present yet
  });

  it("updates active state correctly when hash changes dynamically", async () => {
    vi.mocked(usePathname).mockReturnValue("/docs/database");

    render(<DocsSidebarNav items={mockItems} />);

    expect(screen.getByText("Database")).not.toHaveClass("bg-blue-50");

    await act(async () => {
      window.location.hash = "#setup";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await waitFor(() => {
      expect(screen.getByText("Database")).toHaveClass(
        "bg-blue-50",
        "text-blue-600",
      );
    });
  });

  it("renders footer version information", () => {
    render(<DocsSidebarNav items={mockItems} />);
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });
});
