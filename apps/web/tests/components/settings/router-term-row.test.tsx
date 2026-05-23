/**
 * @file router-term-row.test.tsx
 * @description Unit tests for editable AI router term table rows.
 */

import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "../../test-utils";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RouterTermRow, type RouterTermDraft } from "@/app/settings/components/ai-settings/RouterTermRow";
import type { AIRouterTerm } from "@/app/settings/components/ai-settings/types";

const term: AIRouterTerm = {
  id: "term-1",
  termSetId: "set-1",
  termSetKey: "exploration_terms",
  term: "analyze",
  normalizedTerm: "analyze",
  language: "any",
  matchType: "phrase",
  weight: 1,
  isNegative: false,
  enabled: true,
  notes: "",
};

const draft: RouterTermDraft = {
  term: "analyze",
  language: "any",
  matchType: "phrase",
  weight: 1,
  isNegative: false,
  enabled: true,
  notes: "",
};

function renderRow(props: Partial<ComponentProps<typeof RouterTermRow>> = {}) {
  return render(
    <table>
      <tbody>
        <RouterTermRow
          term={term}
          draft={draft}
          onDraftChange={vi.fn()}
          onSave={vi.fn()}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
          {...props}
        />
      </tbody>
    </table>,
  );
}

describe("RouterTermRow", () => {
  it("edits term cells directly", () => {
    const onDraftChange = vi.fn();
    renderRow({ onDraftChange });

    fireEvent.change(screen.getByLabelText("Router term analyze"), {
      target: { value: "discover" },
    });

    expect(onDraftChange).toHaveBeenLastCalledWith("term-1", { term: "discover" });
  });

  it("exposes row save and remove actions", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onDelete = vi.fn();
    renderRow({ onSave, onDelete });

    await user.click(screen.getByRole("button", { name: /save analyze/i }));
    await user.click(screen.getByRole("button", { name: /remove analyze/i }));

    expect(onSave).toHaveBeenCalledWith("term-1", draft);
    expect(onDelete).toHaveBeenCalledWith("term-1");
  });
});
