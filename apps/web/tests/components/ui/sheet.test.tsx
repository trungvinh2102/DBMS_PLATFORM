import { describe, it, expect } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test-utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

describe("Sheet", () => {
  it("renders trigger and opens content", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <div data-testid="sheet-content">Sheet Content</div>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByText("Open Sheet"));

    await waitFor(() => {
      expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
    });
  });

  it("handles sub-components", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sub</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose>CustomClose</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByText("Open Sub"));

    await waitFor(() => {
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Desc")).toBeInTheDocument();
    });

    // Use a unique label to avoid conflict with the default close button
    fireEvent.click(screen.getByText("CustomClose"));
    await waitFor(() => {
      expect(screen.queryByText("Title")).not.toBeInTheDocument();
    });
  });

  it("handles different sides", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open Top</SheetTrigger>
        <SheetContent side="top">
          <div>Top Content</div>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByText("Open Top"));
    await waitFor(() => {
      expect(screen.getByText("Top Content")).toBeInTheDocument();
    });
  });
});
