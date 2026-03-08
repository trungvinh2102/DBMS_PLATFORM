import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../test-utils";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";

describe("Select", () => {
  it("renders trigger and content", () => {
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

  it("opens and allows selection", async () => {
    render(
      <Select defaultValue="apple">
        <SelectTrigger aria-label="Food">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByLabelText("Food");
    // use fireEvent for opening the dropdown as it's more reliable for Radix/Base UI in tests
    fireEvent.click(trigger);

    // Wait for the content to appear in the portal using findByText
    const bananaItem = await screen.findByText("Banana");
    expect(bananaItem).toBeInTheDocument();

    fireEvent.click(bananaItem);

    // Check if the trigger value updated
    await waitFor(() => {
      expect(screen.getByText("Banana")).toBeInTheDocument();
    });
  });

  it("renders group, label and separator", async () => {
    render(
      <Select>
        <SelectTrigger aria-label="Food">
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectSeparator />
            <SelectItem value="apple">Apple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByLabelText("Food"));

    expect(await screen.findByText("Fruits")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});
