/**
 * @file card.test.tsx
 * @description Unit tests for the Card component and its fragments (Header, Title, Content, Footer).
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";

describe("Card Component", () => {
  it("renders a full card with all fragments", () => {
    const TIT_TEXT = "Card Title";
    const DESC_TEXT = "Description Content";
    const CONTENT_TEXT = "Body Content";
    const FOOT_TEXT = "Footer Area";
    const ACTION_TEXT = "Action";

    render(
      <Card>
        <CardHeader>
          <CardTitle>{TIT_TEXT}</CardTitle>
          <CardDescription>{DESC_TEXT}</CardDescription>
          <CardAction>{ACTION_TEXT}</CardAction>
        </CardHeader>
        <CardContent>{CONTENT_TEXT}</CardContent>
        <CardFooter>{FOOT_TEXT}</CardFooter>
      </Card>,
    );

    expect(screen.getByText(TIT_TEXT)).toBeInTheDocument();
    expect(screen.getByText(DESC_TEXT)).toBeInTheDocument();
    expect(screen.getByText(CONTENT_TEXT)).toBeInTheDocument();
    expect(screen.getByText(FOOT_TEXT)).toBeInTheDocument();
    expect(screen.getByText(ACTION_TEXT)).toBeInTheDocument();
  });

  it("applies the size attribute correctly", () => {
    const { container } = render(<Card size="sm">Small Card</Card>);
    const cardElement = container.querySelector('[data-slot="card"]');
    expect(cardElement).toHaveAttribute("data-size", "sm");
  });
});
