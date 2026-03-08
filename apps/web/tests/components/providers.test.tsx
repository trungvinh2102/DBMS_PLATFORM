import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Providers } from "@/components/providers";

describe("Providers", () => {
  it("renders children correctly", () => {
    // Note: We use raw RTL render here because Providers already includes QueryClientProvider
    render(
      <Providers>
        <div data-testid="child">Provided Content</div>
      </Providers>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
