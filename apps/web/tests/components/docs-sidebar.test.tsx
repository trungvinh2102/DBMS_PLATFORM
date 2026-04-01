import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DocsSidebarNav } from "@/components/docs-sidebar";
import { act } from "react";

// Helper wrapper with MemoryRouter
function renderWithRouter(ui: React.ReactElement, initialEntries = ["/"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

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
    window.location.hash = "";
  });

  it("renders section titles and their icons", () => {
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/intro"]);

    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Core Features")).toBeInTheDocument();
  });

  it("renders all items when section is expanded (default behavior)", () => {
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/intro"]);

    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Installation")).toBeInTheDocument();
    expect(screen.getByText("Disabled Page")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("toggles section collapse / expand when clicking the header", async () => {
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/intro"]);

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
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/install"]);

    const installLink = screen.getByText("Installation");
    expect(installLink).toHaveClass("bg-blue-50", "text-blue-600");

    const introLink = screen.getByText("Introduction");
    expect(introLink).not.toHaveClass("bg-blue-50");
  });

  it("highlights active item based on hash", () => {
    window.location.hash = "#setup";

    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/database"]);

    const databaseLink = screen.getByText("Database");
    expect(databaseLink).toHaveClass("bg-blue-50", "text-blue-600");

    const aiLink = screen.getByText("AI Assistant");
    expect(aiLink).not.toHaveClass("bg-blue-50");
  });

  it("does not highlight item when pathname matches but hash exists", () => {
    window.location.hash = "#somehash";

    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/intro"]);

    const introLink = screen.getByText("Introduction");
    expect(introLink).not.toHaveClass("bg-blue-50");
  });

  it("applies correct styles to disabled items", () => {
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/intro"]);

    const disabledLink = screen.getByText("Disabled Page");
    expect(disabledLink).toHaveClass("pointer-events-none", "opacity-50");
  });

  it("updates active state correctly when hash changes dynamically", async () => {
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/database"]);

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
    renderWithRouter(<DocsSidebarNav items={mockItems} />, ["/docs/intro"]);
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });
});
