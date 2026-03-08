import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "../../test-utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

describe("Sheet", () => {
  it("renders trigger and opens content", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <div data-testid="sheet-content">Sheet Content</div>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByText("Open Sheet"));
    expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
  });
});
