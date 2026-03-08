/**
 * @file avatar.test.tsx
 * @description Unit tests for the Avatar component, including base-ui fallback and image scenarios.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

describe("Avatar Component", () => {
  it("renders fallback text JD", () => {
    const FALLBACK_TEXT = "JD";
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Jane Doe" />
        <AvatarFallback>{FALLBACK_TEXT}</AvatarFallback>
      </Avatar>,
    );

    // Initial state is usually fallback until image is confirmed loaded in base-ui context
    expect(screen.getByText(FALLBACK_TEXT)).toBeInTheDocument();
  });

  it("applies correct size attribute", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>,
    );
    const avatarContainer = container.querySelector('[data-slot="avatar"]');
    expect(avatarContainer).toHaveAttribute("data-size", "lg");
  });
});
