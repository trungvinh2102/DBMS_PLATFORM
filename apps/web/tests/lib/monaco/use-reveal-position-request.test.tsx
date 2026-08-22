/**
 * @file use-reveal-position-request.test.tsx
 * @description Focused coverage for the externally triggerable editor reveal
 * request contract ({ lineNumber, column, nonce }).
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRevealPositionRequest } from "@/lib/monaco/useRevealPositionRequest";
import type { RevealPositionRequest } from "@/lib/monaco/types";

type EditorRef = React.RefObject<
  import("monaco-editor").editor.IStandaloneCodeEditor | null
>;

function createEditorHarness() {
  const editor = {
    setPosition: vi.fn(),
    revealLineInCenter: vi.fn(),
    focus: vi.fn(),
  };
  const editorRef = {
    current: editor,
  } as unknown as EditorRef;
  return { editor, editorRef };
}

describe("useRevealPositionRequest", () => {
  it("positions, reveals, and focuses the editor once per activation", () => {
    const { editor, editorRef } = createEditorHarness();
    const { rerender } = renderHook(
      (props: { request: RevealPositionRequest | null }) =>
        useRevealPositionRequest(props.request, editorRef),
      { initialProps: { request: null as RevealPositionRequest | null } },
    );

    expect(editor.setPosition).not.toHaveBeenCalled();

    rerender({ request: { lineNumber: 4, column: 12, nonce: 1 } });

    expect(editor.setPosition).toHaveBeenCalledTimes(1);
    expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 4, column: 12 });
    expect(editor.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(editor.revealLineInCenter).toHaveBeenCalledWith(4);
    expect(editor.focus).toHaveBeenCalledTimes(1);

    // Rerenders carrying the same nonce must not re-activate the row action.
    rerender({ request: { lineNumber: 4, column: 12, nonce: 1 } });

    expect(editor.setPosition).toHaveBeenCalledTimes(1);
    expect(editor.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(editor.focus).toHaveBeenCalledTimes(1);
  });

  it("applies a request that arrived before the editor finished mounting", () => {
    const editor = {
      setPosition: vi.fn(),
      revealLineInCenter: vi.fn(),
      focus: vi.fn(),
    };
    const editorRef = { current: editor } as unknown as EditorRef;
    // Monaco mounts asynchronously: the ref starts out null while the reveal
    // request is already pending.
    editorRef.current = null;
    const request: RevealPositionRequest = { lineNumber: 6, column: 3, nonce: 11 };

    const { rerender } = renderHook(
      (props: { request: RevealPositionRequest | null; ready: boolean }) =>
        useRevealPositionRequest(props.request, editorRef, props.ready),
      { initialProps: { request, ready: false } },
    );

    expect(editor.setPosition).not.toHaveBeenCalled();

    // Editor finished mounting: ref is populated and readiness flips true.
    (editorRef as { current: unknown }).current = editor;
    rerender({ request, ready: true });

    expect(editor.setPosition).toHaveBeenCalledTimes(1);
    expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 6, column: 3 });
    expect(editor.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(editor.revealLineInCenter).toHaveBeenCalledWith(6);
    expect(editor.focus).toHaveBeenCalledTimes(1);

    // Further rerenders with the same request must not re-fire.
    rerender({ request, ready: true });

    expect(editor.setPosition).toHaveBeenCalledTimes(1);
    expect(editor.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(editor.focus).toHaveBeenCalledTimes(1);
  });

  it("does not replay an already applied request into a newly mounted editor", () => {
    const { editor, editorRef } = createEditorHarness();
    const request: RevealPositionRequest = { lineNumber: 4, column: 12, nonce: 1 };

    const first = renderHook(() => useRevealPositionRequest(request, editorRef));
    expect(editor.setPosition).toHaveBeenCalledTimes(1);
    first.unmount();

    // Tab switch / remount: SQLEditor remounts (key={activeTabId}) while the
    // page-level revealRequest state still holds the stale request object.
    const remounted = createEditorHarness();
    renderHook(
      (props: { request: RevealPositionRequest | null }) =>
        useRevealPositionRequest(props.request, remounted.editorRef),
      { initialProps: { request } },
    );

    // Tab B's editor must not consume tab A's stale request.
    expect(remounted.editor.setPosition).not.toHaveBeenCalled();
    expect(remounted.editor.revealLineInCenter).not.toHaveBeenCalled();
    expect(remounted.editor.focus).not.toHaveBeenCalled();
  });

  it("still applies fresh activations in the remounted editor after skipping a stale one", () => {
    const { editorRef } = createEditorHarness();
    const staleRequest: RevealPositionRequest = { lineNumber: 4, column: 12, nonce: 1 };

    const first = renderHook(() => useRevealPositionRequest(staleRequest, editorRef));
    first.unmount();

    const remounted = createEditorHarness();
    const { rerender } = renderHook(
      (props: { request: RevealPositionRequest | null }) =>
        useRevealPositionRequest(props.request, remounted.editorRef),
      { initialProps: { request: staleRequest } },
    );
    expect(remounted.editor.setPosition).not.toHaveBeenCalled();

    rerender({ request: { lineNumber: 4, column: 12, nonce: 2 } });

    expect(remounted.editor.setPosition).toHaveBeenCalledTimes(1);
    expect(remounted.editor.setPosition).toHaveBeenCalledWith({ lineNumber: 4, column: 12 });
    expect(remounted.editor.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(remounted.editor.focus).toHaveBeenCalledTimes(1);
  });

  it("re-triggers the same position when a fresh nonce arrives", () => {
    const { editor, editorRef } = createEditorHarness();
    const { rerender } = renderHook(
      (props: { request: RevealPositionRequest | null }) =>
        useRevealPositionRequest(props.request, editorRef),
      {
        initialProps: {
          request: { lineNumber: 4, column: 12, nonce: 7 },
        },
      },
    );

    expect(editor.setPosition).toHaveBeenCalledTimes(1);

    rerender({ request: { lineNumber: 4, column: 12, nonce: 8 } });

    expect(editor.setPosition).toHaveBeenCalledTimes(2);
    expect(editor.setPosition).toHaveBeenLastCalledWith({ lineNumber: 4, column: 12 });
    expect(editor.revealLineInCenter).toHaveBeenCalledTimes(2);
    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(4);
    expect(editor.focus).toHaveBeenCalledTimes(2);
  });
});
