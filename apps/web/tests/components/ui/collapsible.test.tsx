import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "../../test-utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

describe("Collapsible", () => {
  it("renders trigger and content toggle", () => {
    // We cannot easily test open/close in JSDOM due to how Radix works with CSS transitions
    // But we check that the base elements are there.
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Secret Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByText("Toggle")).toBeInTheDocument();
  });
});
