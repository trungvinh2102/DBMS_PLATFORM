/**
 * @file use-syntax-diagnostics.ts
 * @description Page-owned syntax diagnostic state for SQL Lab. Collects
 * validation errors reported by the editor via `onErrorsChange` and turns
 * Problems row activations into externally triggerable editor reveal requests
 * ({ lineNumber, column, nonce }) with a fresh nonce per activation.
 */

import { useCallback, useRef, useState } from "react";

import type { ErrorPanelEntry, RevealPositionRequest } from "@/lib/monaco/types";

interface UseSyntaxDiagnosticsReturn {
  /** Diagnostics for the Problems badge/list */
  syntaxErrors: ErrorPanelEntry[];
  /** Latest reveal request, null until a problem row is activated */
  revealRequest: RevealPositionRequest | null;
  /** Passed to the editor container as `onErrorsChange` */
  handleErrorsChange: (errors: ErrorPanelEntry[]) => void;
  /** Passed to the result panel as `onErrorClick` */
  handleErrorClick: (lineNumber: number, column: number) => void;
}

export function useSyntaxDiagnostics(): UseSyntaxDiagnosticsReturn {
  const [syntaxErrors, setSyntaxErrors] = useState<ErrorPanelEntry[]>([]);
  const [revealRequest, setRevealRequest] =
    useState<RevealPositionRequest | null>(null);
  const nonceRef = useRef(0);

  const handleErrorsChange = useCallback((errors: ErrorPanelEntry[]) => {
    setSyntaxErrors(errors);
  }, []);

  const handleErrorClick = useCallback((lineNumber: number, column: number) => {
    nonceRef.current += 1;
    setRevealRequest({ lineNumber, column, nonce: nonceRef.current });
  }, []);

  return {
    syntaxErrors,
    revealRequest,
    handleErrorsChange,
    handleErrorClick,
  };
}
