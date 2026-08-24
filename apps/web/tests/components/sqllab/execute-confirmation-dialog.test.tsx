import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "../../test-utils";
import { ExecuteConfirmationDialog } from "@/app/sqllab/components/ExecuteConfirmationDialog";

const pending = {
  databaseId: "db-1", sql: "UPDATE users SET active = true", autoCommit: true, limit: 100,
  confirmationToken: "token", expiresAt: "2026-08-24T12:00:00Z", risk: "write" as const, reason: "Confirm write",
};

describe("ExecuteConfirmationDialog", () => {
  it("cancels by default and confirms only through Run anyway", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ExecuteConfirmationDialog pending={pending} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText(pending.sql)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
