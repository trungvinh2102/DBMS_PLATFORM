/**
 * @file workspace-git-utils.test.ts
 * @description Regression tests for SQL Lab workspace Git root folder selection.
 */

import { describe, expect, it, vi } from "vitest";
import { chooseWorkspaceRootFolder } from "../../../src/app/sqllab/components/workspace/workspace-git-utils";

describe("chooseWorkspaceRootFolder", () => {
  it("uses the backend native picker in browser mode so absolute paths are preserved", async () => {
    const openTauriFolder = vi.fn(async () => "D:\\tauri-root");
    const pickBackendFolder = vi.fn(async () => "D:\\repo-root");

    const selected = await chooseWorkspaceRootFolder({
      currentRootPath: "D:\\current",
      isTauri: false,
      openTauriFolder,
      pickBackendFolder,
    });

    expect(selected).toBe("D:\\repo-root");
    expect(openTauriFolder).not.toHaveBeenCalled();
    expect(pickBackendFolder).toHaveBeenCalledWith("D:\\current");
  });

  it("uses the Tauri dialog in desktop mode", async () => {
    const openTauriFolder = vi.fn(async () => "D:\\desktop-root");
    const pickBackendFolder = vi.fn(async () => "D:\\browser-root");

    const selected = await chooseWorkspaceRootFolder({
      currentRootPath: "",
      isTauri: true,
      openTauriFolder,
      pickBackendFolder,
    });

    expect(selected).toBe("D:\\desktop-root");
    expect(openTauriFolder).toHaveBeenCalledWith(undefined);
    expect(pickBackendFolder).not.toHaveBeenCalled();
  });
});
