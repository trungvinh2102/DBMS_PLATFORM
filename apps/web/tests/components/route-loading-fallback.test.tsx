import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import { render, screen } from "../test-utils";

// Kept in its own file: a lazy route that suspends throws a thenable which, in
// this React 19 + jsdom setup, poisons the Suspense machinery for later lazy
// renders in the SAME test file. Isolating this test avoids that interference.
const mocks = vi.hoisted(() => ({
  configureDesktopApi: vi.fn(),
  getBackendStatus: vi.fn(),
  quitDesktop: vi.fn(),
  restartBackend: vi.fn(),
  subscribeBackendStatus: vi.fn(),
  unlisten: vi.fn(),
  page: {
    suspendHome: false,
    releaseSuspend: null as (() => void) | null,
  },
}));

vi.mock("@/lib/runtime-api", () => ({
  configureDesktopApi: mocks.configureDesktopApi,
  isTauriRuntime: () => false,
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
    // A controllable thenable, resolved during cleanup so React's Suspense
    // thenable cache is never left with a permanently pending promise.
    throw new Promise<void>((resolve) => {
      mocks.page.releaseSuspend = () => resolve(undefined);
    });
  },
}));

vi.mock("@/app/auth/login/page", () => ({ default: () => <div>Login Page</div> }));
vi.mock("@/app/auth/register/page", () => ({ default: () => <div>Register Page</div> }));
vi.mock("@/app/connections/page", () => ({ default: () => <div>Connections Page</div> }));
vi.mock("@/app/settings/page", () => ({ default: () => <div>Settings Page</div> }));
vi.mock("@/app/sqllab/page", () => ({ default: () => <div>SQL Lab Page</div> }));
vi.mock("@/app/unauthorized/page", () => ({ default: () => <div>Unauthorized Page</div> }));

beforeEach(() => {
  mocks.page.suspendHome = true;
  mocks.subscribeBackendStatus.mockResolvedValue(mocks.unlisten);
  mocks.getBackendStatus.mockResolvedValue({ status: "ready", generation: 1, apiBaseUrl: "/api/" });
  mocks.configureDesktopApi.mockImplementation(() => undefined);
});

afterEach(() => {
  mocks.page.releaseSuspend?.();
  mocks.page.releaseSuspend = null;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("App route loading fallback", () => {
  it("shows a loading fallback while a lazy route is pending", () => {
    render(<App />, { routerProps: { initialEntries: ["/"] } });

    expect(screen.getByText("Loading page...")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.queryByText("Home Page")).not.toBeInTheDocument();
  });
});
