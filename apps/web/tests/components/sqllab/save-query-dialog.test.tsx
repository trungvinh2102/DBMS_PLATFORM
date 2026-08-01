import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "../../test-utils";
import { SaveQueryDialog } from "@/app/sqllab/components/SaveQueryDialog";

describe("SaveQueryDialog", () => {
  it("saves a database-backed query without workspace options", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <SaveQueryDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });
    expect(screen.queryByText(/workspace folder/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Script path")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Monthly Revenue");
    await user.click(screen.getByRole("button", { name: "Save Query" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith("Monthly Revenue", "");
  });
});
