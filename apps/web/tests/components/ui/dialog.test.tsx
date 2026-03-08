import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "../../test-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("opens and displays content when trigger is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Make changes here.</DialogDescription>
          </DialogHeader>
          <div data-testid="dialog-content">Content Body</div>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByText("Open Dialog");
    fireEvent.click(trigger);

    expect(screen.getByText("Edit profile")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
  });
});
