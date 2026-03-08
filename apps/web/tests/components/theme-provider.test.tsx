/**
 * @file theme-provider.test.tsx
 * @description Unit tests for the ThemeProvider, confirming it renders children within the next-themes context.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";

describe("Component: ThemeProvider", () => {
  it("passes its children down for rendering", () => {
    const COMPONENT_CONTENT = "Inner Content Test";

    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div data-testid="target">{COMPONENT_CONTENT}</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("target")).toHaveTextContent(COMPONENT_CONTENT);
  });
});
