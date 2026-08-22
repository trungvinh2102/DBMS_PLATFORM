import { act, render, waitFor } from "../../test-utils";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn().mockResolvedValue({ data: [], columns: [] }) }));

vi.mock("@/lib/api-client", () => ({
  databaseApi: new Proxy({
    execute,
    list: vi.fn().mockResolvedValue([{ id: "db-1", type: "postgresql" }]),
  }, {
    get: (target, property) => target[property as keyof typeof target] || vi.fn().mockResolvedValue([]),
  }),
}));

import { SQLLabToolbar } from "@/app/sqllab/components/SQLLabToolbar";
import { SQLLabProvider, useSQLLabContext, useSQLLabResultContext } from "@/app/sqllab/context/SQLLabContext";

function ConfiguredToolbar() {
  const lab = useSQLLabContext();
  const result = useSQLLabResultContext();
  return (
    <>
      <button onClick={() => { lab.setSelectedDS("db-1"); lab.setSql(""); }}>Configure</button>
      <SQLLabToolbar />
      <output data-testid="result-tab">{result.activeResultTab}</output>
    </>
  );
}

describe("SQL Lab Auto Commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the exact true default payload when running", async () => {
    const view = render(<SQLLabProvider><ConfiguredToolbar /></SQLLabProvider>);

    await act(async () => { await view.getByRole("button", { name: "Configure" }).click(); });
    await waitFor(() => expect(view.getByRole("button", { name: "Run" })).not.toBeDisabled());
    await act(async () => { await view.getByRole("button", { name: "Run" }).click(); });
    await waitFor(() => expect(execute).toHaveBeenCalledWith("db-1", "", true, 1000));
  });

  it("keeps rendered Auto Commit true after success and sends true on the next run", async () => {
    const view = render(<SQLLabProvider><ConfiguredToolbar /></SQLLabProvider>);

    await act(async () => { await view.getByRole("button", { name: "Configure" }).click(); });
    await waitFor(() => expect(view.getByRole("button", { name: "Run" })).not.toBeDisabled());
    const toggle = view.getByRole("switch", { name: "Auto Commit" });
    expect(toggle).toBeChecked();

    await act(async () => { await view.getByRole("button", { name: "Run" }).click(); });
    await waitFor(() => expect(view.getByTestId("result-tab")).toHaveTextContent("results"));
    await waitFor(() => expect(view.getByRole("button", { name: "Run" })).not.toBeDisabled());
    expect(toggle).toBeChecked();

    await act(async () => { await view.getByRole("button", { name: "Run" }).click(); });
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    expect(execute).toHaveBeenNthCalledWith(2, "db-1", "", true, 1000);
  });

  it("sends false after the mouse toggle through the provider execution path", async () => {
    const user = userEvent.setup();

    const view = render(<SQLLabProvider><ConfiguredToolbar /></SQLLabProvider>);
    await act(async () => { await view.getByRole("button", { name: "Configure" }).click(); });
    await waitFor(() => expect(view.getByRole("switch", { name: "Auto Commit" })).toBeChecked());
    const toggle = view.getByRole("switch", { name: "Auto Commit" });
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    await user.click(view.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(execute).toHaveBeenCalledWith("db-1", "", false, 1000));
  });

  it("sends false after the Enter toggle through the provider execution path", async () => {
    const user = userEvent.setup();
    const view = render(<SQLLabProvider><ConfiguredToolbar /></SQLLabProvider>);
    await act(async () => { await view.getByRole("button", { name: "Configure" }).click(); });
    await waitFor(() => expect(view.getByRole("switch", { name: "Auto Commit" })).toBeChecked());
    const toggle = view.getByRole("switch", { name: "Auto Commit" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).not.toBeChecked();
    await user.click(view.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(execute).toHaveBeenCalledWith("db-1", "", false, 1000));
  });

  it("sends false after the Space toggle through the provider execution path", async () => {
    const user = userEvent.setup();
    const view = render(<SQLLabProvider><ConfiguredToolbar /></SQLLabProvider>);
    await act(async () => { await view.getByRole("button", { name: "Configure" }).click(); });
    await waitFor(() => expect(view.getByRole("switch", { name: "Auto Commit" })).toBeChecked());
    const toggle = view.getByRole("switch", { name: "Auto Commit" });
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).not.toBeChecked();
    await user.click(view.getByRole("button", { name: "Run" }));
    await waitFor(() => expect(execute).toHaveBeenCalledWith("db-1", "", false, 1000));
  });

  it("ignores mouse, Space, and Enter while disabled", async () => {
    execute.mockImplementation(() => new Promise(() => {}));
    const view = render(<SQLLabProvider><SQLLabToolbar /></SQLLabProvider>);
    await waitFor(() => expect(view.getByRole("button", { name: "Run" })).not.toBeDisabled());
    await act(async () => { await view.getByRole("button", { name: "Run" }).click(); });
    const toggle = view.getByRole("switch", { name: "Auto Commit" });
    const user = userEvent.setup();

    await waitFor(() => expect(toggle).toHaveAttribute("aria-disabled", "true"));
    await user.click(toggle);
    toggle.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(toggle).toBeChecked();
  });
});
