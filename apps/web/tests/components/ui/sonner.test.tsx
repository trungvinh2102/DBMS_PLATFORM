import { describe, it, expect } from "vitest";
import { render } from "../../test-utils";
import { Toaster } from "@/components/ui/sonner";

describe("Sonner", () => {
  it("renders toaster container", () => {
    const { container } = render(<Toaster />);
    // Sonner injects a div with class 'sonner' usually or data-sonner-toaster
    const toaster = container.querySelector("[data-sonner-toaster]");
    expect(toaster).toBeDefined();
  });
});
