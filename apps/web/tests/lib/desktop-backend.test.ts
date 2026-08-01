import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  invoke: vi.fn(),
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mocks.listen }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ close: mocks.close }),
}));

import {
  getBackendStatus,
  quitDesktop,
  restartBackend,
  subscribeBackendStatus,
} from "@/lib/desktop-backend";

describe("desktop backend wrappers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the typed backend command names", async () => {
    mocks.invoke.mockResolvedValueOnce({ status: "starting", generation: 4 });
    mocks.invoke.mockResolvedValueOnce({ status: "starting", generation: 5 });

    await getBackendStatus();
    await restartBackend();

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, "get_backend_status");
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, "restart_backend");
  });

  it("subscribes to the typed backend status event payload", async () => {
    const callback = vi.fn();
    const unlisten = vi.fn();
    mocks.listen.mockResolvedValue(unlisten);

    await expect(subscribeBackendStatus(callback)).resolves.toBe(unlisten);
    expect(mocks.listen).toHaveBeenCalledWith("backend-status-changed", expect.any(Function));

    const handler = mocks.listen.mock.calls[0][1];
    handler({ payload: { status: "failed", generation: 4, errorCode: "spawnFailed" } });
    expect(callback).toHaveBeenCalledWith({
      status: "failed",
      generation: 4,
      errorCode: "spawnFailed",
    });
  });

  it("closes the current Tauri window", async () => {
    await quitDesktop();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
