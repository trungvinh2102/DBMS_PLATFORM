import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "../../test-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import userEvent from "@testing-library/user-event";

describe("Dialog", () => {
  it("opens and displays content when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Make changes here.</DialogDescription>
          </DialogHeader>
          <div data-testid="dialog-content">Content Body</div>
          <DialogFooter showCloseButton>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByText("Open Dialog");
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("Edit profile")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Edit profile")).not.toBeInTheDocument();
    });
  });
});
