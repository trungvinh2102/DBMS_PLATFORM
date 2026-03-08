import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "../../test-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("Select", () => {
  it("renders trigger and content", () => {
    // Basic rendering test
    render(
      <Select defaultValue="apple">
        <SelectTrigger aria-label="Food">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByLabelText("Food")).toBeInTheDocument();
  });
});
