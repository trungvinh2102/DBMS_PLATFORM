import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  // General
  theme: "light" | "dark" | "system";
  language: "en" | "vi";

  // Editor
  editorFontSize: number;
  editorFontFamily: string;
  editorTabSize: number;
  editorMinimap: boolean;
  editorWordWrap: "on" | "off" | "wordWrapColumn" | "bounded";
  editorLineNumbers: "on" | "off" | "relative" | "interval";
  editorFormatOnPaste: boolean;
  editorFormatOnSave: boolean;

  // Data
  defaultQueryLimit: number;
  showNullAs: string;
  dateTimeFormat: string;
  csvDelimiter: "," | ";";

  // Actions
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLanguage: (lang: "en" | "vi") => void;
  updateEditor: (settings: Partial<SettingsState>) => void;
  updateData: (settings: Partial<SettingsState>) => void;
  resetDefaults: () => void;
}

const defaultSettings = {
  theme: "system" as const,
  language: "en" as const,

  editorFontSize: 14,
  editorFontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
  editorTabSize: 2,
  editorMinimap: true,
  editorWordWrap: "on" as const,
  editorLineNumbers: "on" as const,
  editorFormatOnPaste: true,
  editorFormatOnSave: false,

  defaultQueryLimit: 1000,
  showNullAs: "(null)",
  dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
  csvDelimiter: "," as const,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      updateEditor: (settings) => set((state) => ({ ...state, ...settings })),
      updateData: (settings) => set((state) => ({ ...state, ...settings })),
      resetDefaults: () => set(defaultSettings),
    }),
    {
      name: "app-settings",
    },
  ),
);
