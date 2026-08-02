import { act, StrictMode } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acceptBackendStatus, DesktopReadyGuard } from "@/components/desktop-ready-guard";
import type { BackendStatus } from "@/lib/desktop-backend";
import { render, screen, waitFor } from "../test-utils";

const mocks = vi.hoisted(() => ({
  configureDesktopApi: vi.fn(),
  getBackendStatus: vi.fn(),
  markPerformance: vi.fn(),
  quitDesktop: vi.fn(),
  restartBackend: vi.fn(),
  subscribeBackendStatus: vi.fn(),
  unlisten: vi.fn(),
}));

vi.mock("@/lib/runtime-api", () => ({
  configureDesktopApi: mocks.configureDesktopApi,
  isTauriRuntime: () => Boolean(window.__TAURI_INTERNALS__),
}));

vi.mock("@/lib/desktop-backend", () => ({
  getBackendStatus: mocks.getBackendStatus,
  quitDesktop: mocks.quitDesktop,
  restartBackend: mocks.restartBackend,
  subscribeBackendStatus: mocks.subscribeBackendStatus,
}));

vi.mock("@/lib/performance/performance-marks", () => ({
  markPerformance: mocks.markPerformance,
}));

const configureDesktopApiMock = mocks.configureDesktopApi;
const getBackendStatusMock = mocks.getBackendStatus;
const markPerformanceMock = mocks.markPerformance;
const quitDesktopMock = mocks.quitDesktop;
const restartBackendMock = mocks.restartBackend;
const subscribeBackendStatusMock = mocks.subscribeBackendStatus;
const unlistenMock = mocks.unlisten;

const readyStatus = (generation = 1): BackendStatus => ({
  status: "ready",
  generation,
  apiBaseUrl: "http://127.0.0.1:43123/api/",
});

const statusFor = (status: "starting" | "ready" | "failed"): BackendStatus =>
  status === "failed"
    ? { status, generation: 4, errorCode: "spawnFailed" }
    : status === "ready"
      ? readyStatus(4)
      : { status, generation: 4 };

beforeEach(() => {
  (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
  subscribeBackendStatusMock.mockResolvedValue(unlistenMock);
  getBackendStatusMock.mockResolvedValue({ status: "starting", generation: 1 });
  configureDesktopApiMock.mockImplementation(() => undefined);
  restartBackendMock.mockResolvedValue({ status: "starting", generation: 2 });
});

afterEach(() => {
  vi.clearAllMocks();
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe("DesktopReadyGuard", () => {
  it("configures the dynamic API URL before rendering children", async () => {
    getBackendStatusMock.mockResolvedValue(readyStatus());
    const order: string[] = [];
    configureDesktopApiMock.mockImplementation(() => order.push("configure"));

    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);

    await waitFor(() => expect(configureDesktopApiMock).toHaveBeenCalledWith(
      "http://127.0.0.1:43123/api/",
    ));
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(order).toEqual(["configure"]);
  });

  it("marks frontend_ready only after the API client is configured", async () => {
    getBackendStatusMock.mockResolvedValue(readyStatus());
    const order: string[] = [];
    configureDesktopApiMock.mockImplementation(() => order.push("configure"));
    markPerformanceMock.mockImplementation((name: string) => order.push(`mark:${name}`));

    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);

    await waitFor(() => expect(configureDesktopApiMock).toHaveBeenCalledWith(
      "http://127.0.0.1:43123/api/",
    ));
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(order).toEqual(["configure", "mark:frontend_ready"]);
  });

  it("does not mark frontend_ready before the backend is ready", async () => {
    getBackendStatusMock.mockResolvedValue({ status: "starting", generation: 1 });
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);

    await waitFor(() => expect(getBackendStatusMock).toHaveBeenCalled());
    expect(screen.getByText("Initializing system...")).toBeInTheDocument();
    expect(markPerformanceMock).not.toHaveBeenCalled();
  });

  it("subscribes before reading current state", async () => {
    const order: string[] = [];
    subscribeBackendStatusMock.mockImplementation(async () => {
      order.push("subscribe");
      return unlistenMock;
    });
    getBackendStatusMock.mockImplementation(async () => {
      order.push("get");
      return { status: "starting", generation: 1 };
    });

    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await waitFor(() => expect(order).toEqual(["subscribe", "get"]));
  });

  it("applies a ready event received after the initial state", async () => {
    let listener: ((status: BackendStatus) => void) | undefined;
    subscribeBackendStatusMock.mockImplementation(async (callback) => {
      listener = callback;
      return unlistenMock;
    });

    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await waitFor(() => expect(listener).toBeDefined());
    act(() => listener?.(readyStatus()));

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(configureDesktopApiMock).toHaveBeenCalledWith("http://127.0.0.1:43123/api/");
  });

  it("allows a post-ready failure for the same generation", async () => {
    let listener: ((status: BackendStatus) => void) | undefined;
    subscribeBackendStatusMock.mockImplementation(async (callback) => {
      listener = callback;
      return unlistenMock;
    });
    getBackendStatusMock.mockResolvedValue(readyStatus());
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await screen.findByText("Dashboard");

    act(() => listener?.({ status: "failed", generation: 1, errorCode: "sidecarExited" }));
    expect(await screen.findByText("The local backend stopped during startup.")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it.each([
    ["failed", "ready"],
    ["failed", "starting"],
    ["ready", "starting"],
  ] as const)("ignores same-generation %s -> %s transitions", (current, next) => {
    const currentStatus = statusFor(current);
    const nextStatus = statusFor(next);

    expect(acceptBackendStatus(currentStatus, nextStatus)).toBe(false);
  });

  it.each([
    ["starting", "ready"],
    ["starting", "failed"],
    ["ready", "failed"],
  ] as const)("accepts same-generation %s -> %s transitions", (current, next) => {
    const currentStatus = statusFor(current);
    const nextStatus = statusFor(next);

    expect(acceptBackendStatus(currentStatus, nextStatus)).toBe(true);
  });

  it("accepts any valid newer generation, including Retry starting", () => {
    expect(acceptBackendStatus(
      { status: "failed", generation: 4, errorCode: "spawnFailed" },
      { status: "starting", generation: 5 },
    )).toBe(true);
    expect(acceptBackendStatus(readyStatus(4), { status: "failed", generation: 5, errorCode: "sidecarExited" })).toBe(true);
  });

  it("keeps splash and app siblings in the shared motion path during ready", async () => {
    let listener: ((status: BackendStatus) => void) | undefined;
    subscribeBackendStatusMock.mockImplementation(async (callback) => {
      listener = callback;
      return unlistenMock;
    });
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await waitFor(() => expect(listener).toBeDefined());

    act(() => listener?.(readyStatus()));

    expect(screen.getByText("QurioDB")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("ignores stale generations and same-generation starting snapshots", async () => {
    let listener: ((status: BackendStatus) => void) | undefined;
    let resolveCurrent: ((status: BackendStatus) => void) | undefined;
    subscribeBackendStatusMock.mockImplementation(async (callback) => {
      listener = callback;
      return unlistenMock;
    });
    getBackendStatusMock.mockImplementation(() => new Promise((resolve) => {
      resolveCurrent = resolve;
    }));
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await waitFor(() => expect(listener).toBeDefined());

    act(() => listener?.(readyStatus(2)));
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    act(() => {
      listener?.({ status: "starting", generation: 2 });
      listener?.({ status: "failed", generation: 1, errorCode: "spawnFailed" });
      resolveCurrent?.({ status: "starting", generation: 1 });
    });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("The local backend could not be started.")).not.toBeInTheDocument();
  });

  it.each([
    ["spawnFailed", "The local backend could not be started."],
    ["sidecarExited", "The local backend stopped during startup."],
    ["readinessTimeout", "The local backend took too long to become ready."],
    ["identityMismatch", "The local backend could not be verified."],
    ["restartFailed", "The local backend could not be restarted."],
  ] as const)("shows the exact %s error copy with actions", async (errorCode, copy) => {
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode });
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);

    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quit" })).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveAttribute("aria-busy");
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("keeps the starting status semantic and busy", async () => {
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    const status = await screen.findByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("restarts the backend and disables both actions while pending", async () => {
    let resolveRestart: ((status: BackendStatus) => void) | undefined;
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "readinessTimeout" });
    restartBackendMock.mockImplementation(() => new Promise((resolve) => {
      resolveRestart = resolve;
    }));
    const user = userEvent.setup();
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(restartBackendMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quit" })).toBeDisabled();
    await act(async () => {
      resolveRestart?.({ status: "starting", generation: 2 });
      await Promise.resolve();
    });
  });

  it("completes Retry after StrictMode setup-cleanup-setup", async () => {
    let resolveRestart: ((status: BackendStatus) => void) | undefined;
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "spawnFailed" });
    restartBackendMock.mockImplementation(() => new Promise((resolve) => {
      resolveRestart = resolve;
    }));
    const user = userEvent.setup();
    render(
      <StrictMode>
        <DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>
      </StrictMode>,
    );
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    await act(async () => {
      resolveRestart?.({ status: "starting", generation: 2 });
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("maps a rejected Retry command to restartFailed", async () => {
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "spawnFailed" });
    restartBackendMock.mockRejectedValue(new Error("command rejected"));
    const user = userEvent.setup();
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByText("The local backend could not be restarted.")).toBeInTheDocument();
  });

  it("quits through the typed wrapper and disables controls", async () => {
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "spawnFailed" });
    let resolveQuit: (() => void) | undefined;
    quitDesktopMock.mockImplementation(() => new Promise<void>((resolve) => { resolveQuit = resolve; }));
    const user = userEvent.setup();
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await user.click(await screen.findByRole("button", { name: "Quit" }));

    expect(quitDesktopMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quit" })).toBeDisabled();
    await act(async () => {
      resolveQuit?.();
      await Promise.resolve();
    });
  });

  it("restores failure actions when Quit rejects without changing the failure copy", async () => {
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "spawnFailed" });
    quitDesktopMock.mockRejectedValue(new Error("window close rejected"));
    const user = userEvent.setup();
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await user.click(await screen.findByRole("button", { name: "Quit" }));

    expect(await screen.findByText("The local backend could not be started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Quit" })).toBeEnabled();
  });

  it("restores Quit controls after rejection under StrictMode", async () => {
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "spawnFailed" });
    quitDesktopMock.mockRejectedValue(new Error("window close rejected"));
    const user = userEvent.setup();
    render(
      <StrictMode>
        <DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>
      </StrictMode>,
    );
    await user.click(await screen.findByRole("button", { name: "Quit" }));

    expect(screen.getByRole("button", { name: "Quit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("does not update state when a rejected Quit resolves after unmount", async () => {
    getBackendStatusMock.mockResolvedValue({ status: "failed", generation: 1, errorCode: "spawnFailed" });
    let rejectQuit: ((reason?: unknown) => void) | undefined;
    quitDesktopMock.mockImplementation(() => new Promise<void>((_, reject) => { rejectQuit = reject; }));
    const user = userEvent.setup();
    const view = render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    await user.click(await screen.findByRole("button", { name: "Quit" }));
    view.unmount();

    await act(async () => {
      rejectQuit?.(new Error("window close rejected"));
      await Promise.resolve();
    });
  });

  it("maps an invalid ready URL to identityMismatch without rendering children", async () => {
    getBackendStatusMock.mockResolvedValue(readyStatus());
    configureDesktopApiMock.mockImplementation(() => {
      throw new Error("invalid URL");
    });
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);

    expect(await screen.findByText("The local backend could not be verified.")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("renders immediately in browser mode without runtime calls", () => {
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(getBackendStatusMock).not.toHaveBeenCalled();
    expect(subscribeBackendStatusMock).not.toHaveBeenCalled();
    expect(configureDesktopApiMock).not.toHaveBeenCalled();
  });

  it("removes the listener after unmount, including async setup", async () => {
    let resolveSubscribe: ((unlisten: () => void) => void) | undefined;
    subscribeBackendStatusMock.mockImplementation(() => new Promise((resolve) => {
      resolveSubscribe = resolve;
    }));
    const view = render(<DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>);
    view.unmount();
    act(() => resolveSubscribe?.(unlistenMock));

    await waitFor(() => expect(unlistenMock).toHaveBeenCalledOnce());
    expect(getBackendStatusMock).not.toHaveBeenCalled();
  });

  it("cleans up both StrictMode subscriptions without leaving duplicates", async () => {
    const view = render(
      <StrictMode>
        <DesktopReadyGuard><div>Dashboard</div></DesktopReadyGuard>
      </StrictMode>,
    );

    await waitFor(() => expect(subscribeBackendStatusMock).toHaveBeenCalled());
    view.unmount();
    await waitFor(() => expect(unlistenMock).toHaveBeenCalled());
  });
});
