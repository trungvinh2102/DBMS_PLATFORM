/**
 * @file loader.test.tsx
 * @description Unit tests for the loading spinner component.
 */

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Loader from "@/components/loader";

describe("Component: Loader", () => {
  it("renders the animated spinner icon", () => {
    const { container } = render(<Loader />);
    const spinnerElement = container.querySelector("svg");

    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass("animate-spin");
  });
});
