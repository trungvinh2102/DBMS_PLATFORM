import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/use-settings-store";

describe("useSettingsStore", () => {
  beforeEach(() => {
    // Reset store to default before each test
    useSettingsStore.getState().resetDefaults();
  });

  it("should have default values", () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe("system");
    expect(state.language).toBe("en");
    expect(state.editorFontSize).toBe(14);
  });

  it("should update theme", () => {
    useSettingsStore.getState().setTheme("dark");
    expect(useSettingsStore.getState().theme).toBe("dark");
  });

  it("should update language", () => {
    useSettingsStore.getState().setLanguage("vi");
    expect(useSettingsStore.getState().language).toBe("vi");
  });

  it("should update editor settings", () => {
    useSettingsStore
      .getState()
      .updateEditor({ editorFontSize: 18, editorMinimap: false });
    expect(useSettingsStore.getState().editorFontSize).toBe(18);
    expect(useSettingsStore.getState().editorMinimap).toBe(false);
  });

  it("should reset to defaults", () => {
    useSettingsStore.getState().setTheme("light");
    useSettingsStore.getState().setLanguage("vi");

    useSettingsStore.getState().resetDefaults();

    const state = useSettingsStore.getState();
    expect(state.theme).toBe("system");
    expect(state.language).toBe("en");
  });

  it("should update data settings", () => {
    useSettingsStore
      .getState()
      .updateData({ defaultQueryLimit: 500, showNullAs: "NULL" });
    expect(useSettingsStore.getState().defaultQueryLimit).toBe(500);
    expect(useSettingsStore.getState().showNullAs).toBe("NULL");
  });
});
