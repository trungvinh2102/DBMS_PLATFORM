/**
 * @file task-routing-card.test.tsx
 * @description Unit tests for the AI task routing editable table.
 */

import { render, screen } from "../../test-utils";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TaskRoutingCard } from "@/app/settings/components/ai-settings/TaskRoutingCard";
import type { AIModel, AITaskAssignment, AITaskCatalogItem } from "@/app/settings/components/ai-settings/types";

const catalog: AITaskCatalogItem[] = [
  {
    key: "chat.general",
    name: "General chat",
    description: "Fast assistant responses that do not need database context.",
    requiredCapabilities: [],
    recommendedCapabilities: [],
  },
];

const models: AIModel[] = [
  {
    id: "model-1",
    name: "Gemini Flash",
    modelId: "gemini-flash",
    provider: "Google",
    description: "Fast model",
    isActive: true,
    isDefault: true,
    capabilities: {},
  },
];

const assignments: AITaskAssignment[] = [
  {
    taskKey: "chat.general",
    modelId: null,
    fallbackModelId: null,
    enabled: true,
  },
];

describe("TaskRoutingCard", () => {
  it("renders routing rows in a dense table", () => {
    render(
      <TaskRoutingCard
        catalog={catalog}
        assignments={assignments}
        models={models}
        isLoading={false}
        isSaving={false}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
    expect(screen.getByText("General chat")).toBeInTheDocument();
  });

  it("saves edited enabled state from the table", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <TaskRoutingCard
        catalog={catalog}
        assignments={assignments}
        models={models}
        isLoading={false}
        isSaving={false}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByLabelText("Enable General chat"));
    await user.click(screen.getByRole("button", { name: /save routing/i }));

    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        taskKey: "chat.general",
        enabled: false,
      }),
    ]);
  });
});
