/**
 * @file settings-layout.test.tsx
 * @description Unit tests verifying layout container sizing constraints across settings tabs and SettingsPage composition.
 */

import { render, screen } from "../../test-utils";
import { describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/settings/page";
import { SettingsContent } from "@/app/settings/components/SettingsContent";
import { GeneralSettings } from "@/app/settings/components/GeneralSettings";
import { EditorSettings } from "@/app/settings/components/EditorSettings";
import { DataSettings } from "@/app/settings/components/DataSettings";
import { AccountSettings } from "@/app/settings/components/AccountSettings";
import { AISettings } from "@/app/settings/components/AISettings";
import { SettingsActionsProvider } from "@/app/settings/context/SettingsActionsContext";

// Mock API client dependencies for components with data-fetching hooks
vi.mock("@/lib/api-client", () => ({
  userApi: {
    getSettings: vi.fn().mockResolvedValue({}),
    updateSettings: vi.fn().mockResolvedValue({}),
    updateProfile: vi.fn().mockResolvedValue({}),
    changePassword: vi.fn().mockResolvedValue({}),
  },
  databaseApi: {
    list: vi.fn().mockResolvedValue([]),
  },
  aiApi: {
    getAIConfig: vi.fn().mockResolvedValue({ apiKey: "test-key", provider: "Google" }),
    getModels: vi.fn().mockResolvedValue([]),
    getAIStatus: vi.fn().mockResolvedValue({}),
    getTaskCatalog: vi.fn().mockResolvedValue([]),
    getTaskAssignments: vi.fn().mockResolvedValue([]),
    saveAIConfig: vi.fn().mockResolvedValue({}),
    addModel: vi.fn().mockResolvedValue({}),
    deleteModel: vi.fn().mockResolvedValue({}),
    saveTaskAssignments: vi.fn().mockResolvedValue({}),
  },
}));

// Mock useAuth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Test User", email: "test@example.com" },
    setUser: vi.fn(),
  }),
  IS_AUTH_DISABLED: false,
}));

const mockEditorSettings = {
  editorFontSize: 14,
  editorFontFamily: "'Fira Code', monospace",
  editorTabSize: 2,
  editorMinimap: true,
  editorWordWrap: "on" as const,
  editorLineNumbers: "on" as const,
  editorFormatOnPaste: true,
  editorFormatOnSave: false,
  editorLigatures: true,
  editorInlineSuggestions: true,
};

const mockDataSettings = {
  defaultQueryLimit: 1000,
  queryTimeout: true,
  autoExplain: false,
  showNullAs: "(null)",
  dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
  csvDelimiter: "," as const,
  resultEncoding: "UTF-8",
};

describe("SettingsPage & SettingsContent Integration", () => {
  it("renders SettingsPage root with SettingsActionsProvider and SettingsContent", async () => {
    render(<SettingsPage />);

    expect(await screen.findByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
  });

  it("renders SettingsContent inside SettingsActionsProvider", async () => {
    render(
      <SettingsActionsProvider>
        <SettingsContent />
      </SettingsActionsProvider>
    );

    expect(await screen.findByRole("heading", { name: "Settings", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /General/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Editor/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Data/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /AI Assistant/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Account/i })).toBeInTheDocument();
  });
});

describe("Settings Layout Container Heights", () => {
  it("verifies GeneralSettings container uses calc(100vh-175px)", () => {
    const { container } = render(
      <GeneralSettings
        theme="dark"
        settings={{ dynamicColorInjection: false, reducedMotion: false, enableBlurEffects: true }}
        updateGeneral={vi.fn()}
        onThemeChange={vi.fn()}
      />
    );

    const scrollContainer = container.querySelector('[class*="calc(100vh-175px)"]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("max-h-[calc(100vh-175px)]");
  });

  it("verifies EditorSettings container uses calc(100vh-175px)", () => {
    const { container } = render(
      <EditorSettings
        settings={mockEditorSettings}
        updateEditor={vi.fn()}
      />
    );

    const scrollContainer = container.querySelector('[class*="calc(100vh-175px)"]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("max-h-[calc(100vh-175px)]");
  });

  it("verifies DataSettings container uses calc(100vh-175px)", () => {
    const { container } = render(
      <DataSettings
        settings={mockDataSettings}
        updateData={vi.fn()}
      />
    );

    const scrollContainer = container.querySelector('[class*="calc(100vh-175px)"]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("max-h-[calc(100vh-175px)]");
  });

  it("verifies AccountSettings container uses calc(100vh-175px)", () => {
    const { container } = render(
      <SettingsActionsProvider>
        <AccountSettings
          user={{ name: "Test User", email: "test@example.com" }}
        />
      </SettingsActionsProvider>
    );

    const scrollContainer = container.querySelector('[class*="calc(100vh-175px)"]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("h-[calc(100vh-175px)]");
  });

  it("verifies AISettings container uses calc(100vh-175px)", () => {
    const { container } = render(
      <SettingsActionsProvider>
        <AISettings />
      </SettingsActionsProvider>
    );

    const scrollContainer = container.querySelector('[class*="calc(100vh-175px)"]');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("h-[calc(100vh-175px)]");
  });
});
