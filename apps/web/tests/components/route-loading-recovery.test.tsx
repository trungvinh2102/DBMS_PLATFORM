import { act } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import type { BackendStatus } from "@/lib/desktop-backend";
import { render, screen, waitFor } from "../test-utils";

const mocks = vi.hoisted(() => ({
  configureDesktopApi: vi.fn(),
  getBackendStatus: vi.fn(),
  quitDesktop: vi.fn(),
  restartBackend: vi.fn(),
  subscribeBackendStatus: vi.fn(),
  unlisten: vi.fn(),
  page: {
    failHome: false,
    homeRenders: 0,
  },
}));

vi.mock("@/lib/runtime-api", () => ({
  configureDesktopApi: mocks.configureDesktopApi,
  isTauriRuntime: () =>
    Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__),
}));

vi.mock("@/lib/desktop-backend", () => ({
  getBackendStatus: mocks.getBackendStatus,
  quitDesktop: mocks.quitDesktop,
  restartBackend: mocks.restartBackend,
  subscribeBackendStatus: mocks.subscribeBackendStatus,
}));

vi.mock("@/lib/performance/performance-marks", () => ({
  markPerformance: vi.fn(),
  measurePerformance: vi.fn(),
  clearPerformanceMarks: vi.fn(),
}));

vi.mock("@/components/auth/auth-guard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/header", () => ({
  Header: () => <header data-testid="app-header">App Header</header>,
}));

vi.mock("@/app/page", () => ({
  default: () => {
    if (mocks.page.failHome) {
      throw new Error("Failed to fetch dynamically imported module: /src/app/page.tsx");
    }
    mocks.page.homeRenders += 1;
    return <div>Home Page</div>;
  },
}));

vi.mock("@/app/auth/login/page", () => ({ default: () => <div>Login Page</div> }));
vi.mock("@/app/auth/register/page", () => ({ default: () => <div>Register Page</div> }));
vi.mock("@/app/connections/page", () => ({ default: () => <div>Connections Page</div> }));
vi.mock("@/app/settings/page", () => ({ default: () => <div>Settings Page</div> }));
vi.mock("@/app/sqllab/page", () => ({ default: () => <div>SQL Lab Page</div> }));
vi.mock("@/app/unauthorized/page", () => ({ default: () => <div>Unauthorized Page</div> }));

beforeEach(() => {
  mocks.page.failHome = false;
  mocks.page.homeRenders = 0;
  mocks.subscribeBackendStatus.mockResolvedValue(mocks.unlisten);
  mocks.getBackendStatus.mockResolvedValue({ status: "ready", generation: 1, apiBaseUrl: "/api/" });
  mocks.configureDesktopApi.mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
});

describe("RouteErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <RouteErrorBoundary onRetry={vi.fn()}>
        <div>Boundary Content</div>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("Boundary Content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument();
  });

  it("shows a recovery UI instead of blanking when a child throws", () => {
    const onRetry = vi.fn();
    function Boom(): never {
      throw new Error("boom");
    }
    render(
      <RouteErrorBoundary onRetry={onRetry}>
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Couldn't load this page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("re-renders children and calls onRetry when Try Again is clicked", async () => {
    const onRetry = vi.fn();
    let throwNext = true;
    function Flaky() {
      if (throwNext) throw new Error("boom");
      return <div>Recovered Content</div>;
    }
    const user = userEvent.setup();
    render(
      <RouteErrorBoundary onRetry={onRetry}>
        <Flaky />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();

    throwNext = false;
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText("Recovered Content")).toBeInTheDocument();
  });
});

describe("App route loading and lazy recovery", () => {
  it("keeps the shell visible and shows a recovery UI when a lazy route fails", async () => {
    mocks.page.failHome = true;
    render(<App />, { routerProps: { initialEntries: ["/"] } });

    expect(await screen.findByRole("button", { name: "Try Again" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });

  it("retries a failed route by re-attempting the lazy import", async () => {
    mocks.page.failHome = true;
    const user = userEvent.setup();
    render(<App />, { routerProps: { initialEntries: ["/"] } });
    await screen.findByRole("button", { name: "Try Again" });

    mocks.page.failHome = false;
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(await screen.findByText("Home Page")).toBeInTheDocument();
    expect(mocks.page.homeRenders).toBeGreaterThanOrEqual(1);
  });
});

describe("DesktopReadyGuard stays ahead of route content", () => {
  it("does not render route content until the backend is ready", async () => {
    let listener: ((status: BackendStatus) => void) | undefined;
    mocks.subscribeBackendStatus.mockImplementation(async (callback) => {
      listener = callback;
      return mocks.unlisten;
    });
    mocks.getBackendStatus.mockResolvedValue({ status: "starting", generation: 1 });
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};

    render(<App />, { routerProps: { initialEntries: ["/"] } });

    expect(screen.getByText("Initializing system...")).toBeInTheDocument();
    expect(screen.queryByTestId("app-header")).not.toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();

    await waitFor(() => expect(listener).toBeDefined());
    act(() =>
      listener?.({ status: "ready", generation: 2, apiBaseUrl: "http://127.0.0.1:43123/api/" }),
    );

    expect(await screen.findByText("Home Page")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(mocks.configureDesktopApi).toHaveBeenCalledWith("http://127.0.0.1:43123/api/");
  });
});
