/**
 * @file add-router-term-dialog.test.tsx
 * @description Unit tests for the AI router term creation dialog.
 */

import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddRouterTermDialog } from "@/app/settings/components/ai-settings/AddRouterTermDialog";
import type { RouterTermDraft } from "@/app/settings/components/ai-settings/RouterTermRow";
import { render, screen } from "../../test-utils";

const emptyDraft: RouterTermDraft = {
  term: "",
  language: "any",
  matchType: "phrase",
  weight: 1,
  isNegative: false,
  enabled: true,
  notes: "",
};

function DialogHarness({ onCreate = vi.fn() }: { onCreate?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<RouterTermDraft>(emptyDraft);

  return (
    <AddRouterTermDialog
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      draft={draft}
      setDraft={setDraft}
      selectedSetLabel="Exploration"
      canCreate={Boolean(draft.term.trim())}
      isCreating={false}
      onCreate={onCreate}
    />
  );
}

describe("AddRouterTermDialog", () => {
  it("opens a dialog and creates a term from the modal form", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<DialogHarness onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: /add term/i }));

    expect(screen.getByRole("heading", { name: /add router term/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create term/i })).toBeDisabled();

    const termInput = screen.getByPlaceholderText(/keyword or phrase/i);
    fireEvent.change(termInput, { target: { value: "analyze revenue" } });
    await waitFor(() => expect(termInput).toHaveValue("analyze revenue"));
    await user.click(screen.getByRole("button", { name: /create term/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
