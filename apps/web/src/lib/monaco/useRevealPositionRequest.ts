/**
 * @file useRevealPositionRequest.ts
 * @description Applies an externally triggerable reveal request
 * ({ lineNumber, column, nonce }) to a Monaco editor instance: moves the caret,
 * reveals the line in the center, and restores editor focus. Requests are
 * deduplicated by nonce so re-renders never double-fire, while a fresh nonce
 * for the same position activates again.
 *
 * Consumption is also recorded process-wide per request object. The page-level
 * reveal request outlives individual editor mounts (SQL Lab remounts SQLEditor
 * on tab switch via `key={activeTabId}`), so a freshly mounted editor must not
 * replay an activation that another editor instance already applied. A new
 * object with a fresh nonce (a deliberate re-activation) still applies.
 */

import { useEffect, useRef } from "react";
import type * as monacoEditor from "monaco-editor";

import type { RevealPositionRequest } from "./types";

/** Request objects already applied by some editor instance (durable across mounts). */
const appliedRequests = new WeakSet<RevealPositionRequest>();

export function useRevealPositionRequest(
  request: RevealPositionRequest | null | undefined,
  editorRef: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>,
  isEditorReady = true,
) {
  const appliedNonceRef = useRef(0);

  useEffect(() => {
    if (!isEditorReady) return;
    if (!request || request.nonce === appliedNonceRef.current) return;
    if (appliedRequests.has(request)) return;
    const editor = editorRef.current;
    if (!editor) return;

    appliedNonceRef.current = request.nonce;
    appliedRequests.add(request);
    editor.setPosition({ lineNumber: request.lineNumber, column: request.column });
    editor.revealLineInCenter(request.lineNumber);
    editor.focus();
  }, [request, editorRef, isEditorReady]);
}
