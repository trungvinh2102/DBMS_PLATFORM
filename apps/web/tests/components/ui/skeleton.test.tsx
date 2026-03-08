import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a Skeleton placeholder", () => {
    const { container } = render(<Skeleton className="w-full h-4" />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toHaveClass("w-full h-4");
  });

  it("adds custom classes", () => {
    const { container } = render(<Skeleton className="rounded-full" />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toHaveClass("rounded-full");
  });
});
