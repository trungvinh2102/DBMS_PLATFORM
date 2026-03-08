import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";

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

  it("renders with badge", () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
        <AvatarBadge data-testid="badge" />
      </Avatar>,
    );
    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });

  it("renders within a group", () => {
    render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <AvatarGroupCount data-testid="count">+2</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("+2");
  });
});
