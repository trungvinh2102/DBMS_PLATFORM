import { describe, it, expect } from "vitest";
import { render, screen } from "../../test-utils";
import { AuthLayout } from "@/components/auth/auth-layout";

describe("AuthLayout", () => {
  it("renders children correctly", () => {
    render(
      <AuthLayout>
        <div data-testid="test-child">Content</div>
      </AuthLayout>,
    );
    expect(screen.getByTestId("test-child")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
