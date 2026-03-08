/**
 * @file tabs.test.tsx
 * @description Unit tests for the Tabs component, switching through content via triggers.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

describe("Tabs Component", () => {
  const setup = () =>
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content for One</TabsContent>
        <TabsContent value="tab2">Content for Two</TabsContent>
      </Tabs>,
    );

  it("renders default content but not hidden content", () => {
    setup();
    expect(screen.getByText("Content for One")).toBeInTheDocument();
    expect(screen.queryByText("Content for Two")).not.toBeInTheDocument();
  });

  it("switches content when tab trigger is clicked", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByText("Tab Two"));

    expect(screen.queryByText("Content for One")).not.toBeInTheDocument();
    expect(screen.getByText("Content for Two")).toBeInTheDocument();
  });
});
