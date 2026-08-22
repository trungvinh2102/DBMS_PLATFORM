/**
 * @file editor-validation-problems-integration.test.tsx
 * @description Integration coverage for the SQL Lab validation pipeline without
 * mocking the code under test: the real `useEditorValidation` hook runs against
 * the real `markersToErrorEntries` mapping (`validationService`'s mapping logic
 * is imported unmocked) and the resulting entries flow through the real
 * `SQLLabResultPanel`/`ProblemsList`/`ResultFooter` rendering.
 *
 * Doubled boundaries:
 * - The parser entry point `validateCode`: `antlr4ng` (dt-sql-parser's runtime)
 *   cannot be resolved in the Vitest/jsdom environment, so the parser boundary
 *   returns a genuine `ValidationMarker` payload in the exact shape the real
 *   dt-sql-parser produces for this multiline invalid SQL (verified separately
 *   against the real parser and re-proven in the browser repro).
 * - The `SQLLabContext` hooks are replaced with minimal state holders (they are
 *   plain state plumbing, not part of the marker-to-error mapping).
 * - The Monaco instance/editor refs are stubs because Monaco cannot run in
 *   jsdom; they only record `setModelMarkers` calls so the editor-marker side
 *   of `useEditorValidation` can still be asserted.
 *
 * Expected values are read back from the same genuine marker data, then the
 * test asserts that the rendered Problems row shows exactly the
 * `[line:column]`, message, and severity derived from
 * `marker.startLineNumber`/`marker.startColumn`.
 */

import React from "react";
import { fireEvent, render, waitFor } from "../../test-utils";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useEditorValidation } from "@/lib/monaco/useEditorValidation";
import { validateCode } from "@/lib/monaco/validationService";
import { SQLLabResultPanel } from "@/app/sqllab/components/SQLLabResultPanel";

// Genuine ValidationMarker payload, matching the real dt-sql-parser output for
// INVALID_SQL (line 3, column 6, "Unexpected token 'id'", Error severity).
const { PARSER_MARKER, INVALID_SQL, VALID_SQL } = vi.hoisted(() => ({
  INVALID_SQL: ["SELECT *", "FROM users", "WHRE id = 1;"].join("\n"),
  VALID_SQL: "SELECT 1;\nSELECT 2;",
  PARSER_MARKER: {
    startLineNumber: 3,
    startColumn: 6,
    endLineNumber: 3,
    endColumn: 8,
    message: "Unexpected token 'id'",
    severity: 8,
    source: "dt-sql-parser",
  },
}));

// Parser-boundary doubles only: `antlr4ng` (dt-sql-parser's runtime) cannot be
// resolved in the Vitest/jsdom environment, so each language validator is
// stubbed while returning genuine `ValidationMarker` payloads. Everything
 // downstream — `validateCode` dispatch, `markersToErrorEntries`, the hook, and
// every rendered component — stays real.
vi.mock("@/lib/monaco/validators/sql-validator", () => ({
  validateSQL: (code: string) => {
    if (code.includes("WHRE")) {
      return {
        isValid: false,
        markers: [PARSER_MARKER],
        validationTime: 1,
      };
    }
    return { isValid: true, markers: [], validationTime: 0 };
  },
}));
vi.mock("@/lib/monaco/validators/json-validator", () => ({
  validateJSON: () => ({ isValid: true, markers: [], validationTime: 0 }),
}));
vi.mock("@/lib/monaco/validators/js-validator", () => ({
  validateJavaScript: () => ({ isValid: true, markers: [], validationTime: 0 }),
}));
vi.mock("@/lib/monaco/validators/python-validator", () => ({
  validatePython: () => ({ isValid: true, markers: [], validationTime: 0 }),
}));
vi.mock("@/lib/monaco/validators/redis-validator", () => ({
  validateRedis: () => ({ isValid: true, markers: [], validationTime: 0 }),
}));

const { ctxHolder, setModelMarkers, modelStub } = vi.hoisted(() => {
  const modelStub = {};
  const setModelMarkers = vi.fn();
  const ctxHolder: Record<string, any> = {
    lab: {
      showAISidebar: false,
      showRightPanel: false,
      selectedDS: "db-1",
      selectedDSType: "postgresql",
      selectedSchema: "public",
      dataSources: [{ id: "db-1", type: "postgresql" }],
      resultEncoding: "UTF-8",
      tabSize: 4,
      fixSQLError: undefined,
      setFixSQLError: vi.fn(),
    },
    editor: {
      sql: "",
      tabs: [],
      activeTabId: "1",
      tabSize: 4,
    },
    result: {
      results: [],
      columns: [],
      error: null,
      executing: false,
      executionTime: 0,
      currentTData: [],
      currentTColumns: [],
      loadingTData: false,
      activeResultTab: "results",
      autoCommit: true,
    },
  };
  ctxHolder.result.setActiveResultTab = (tab: string) => {
    ctxHolder.result = { ...ctxHolder.result, activeResultTab: tab };
    ctxHolder.requestRerender?.();
  };
  return { ctxHolder, setModelMarkers, modelStub };
});

vi.mock("@/app/sqllab/context/SQLLabContext", () => ({
  useSQLLabContext: () => ctxHolder.lab,
  useSQLLabEditorContext: () => ctxHolder.editor,
  useSQLLabTabMetadataContext: () => ({ activeTabName: undefined }),
  useSQLLabResultContext: () => ctxHolder.result,
  useSQLLabCursorContext: () => ({ cursorPos: { lineNumber: 1, column: 1 } }),
}));

/** Harness exposing the hook's `validate` to the test via trigger buttons. */
function ValidationHarness({
  onErrorClick,
}: {
  onErrorClick: (line: number, column: number) => void;
}) {
  const [, forceUpdate] = React.useState(0);
  const monacoRef = React.useRef({
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
    editor: { setModelMarkers },
  }) as any;
  const editorRef = React.useRef({ getModel: () => modelStub }) as any;

  const { errors, markers, validate } = useEditorValidation({
    monacoRef,
    editorRef,
    language: "sql",
    debounceMs: 5,
    validationOptions: { sqlDialect: "postgresql" },
    markerId: "sql-syntax-validator",
  });

  ctxHolder.requestRerender = () => forceUpdate((n) => n + 1);

  return (
    <div>
      <button type="button" onClick={() => validate(INVALID_SQL)}>
        Run invalid SQL
      </button>
      <button type="button" onClick={() => validate(VALID_SQL)}>
        Run valid SQL
      </button>
      <output data-testid="hook-error-count">{errors.length}</output>
      <output data-testid="hook-marker-count">{markers.length}</output>
      <SQLLabResultPanel syntaxErrors={errors} onErrorClick={onErrorClick} />
    </div>
  );
}

describe("useEditorValidation -> SQLLabResultPanel Problems integration", () => {
  let onErrorClick: Mock<(line: number, column: number) => void>;

  beforeEach(() => {
    onErrorClick = vi.fn();
    setModelMarkers.mockClear();
    ctxHolder.result = {
      ...ctxHolder.result,
      activeResultTab: "results",
    };
    ctxHolder.requestRerender = undefined;
  });

  function expectedMarkerFor(code: string) {
    // Read expectations from the same parser-boundary payload the hook
    // consumes; the test then proves the real mapping + rendering match it.
    const result = validateCode(code, "sql");
    expect(result.isValid).toBe(false);
    const marker = result.markers.find((m) => m.severity === 8);
    expect(marker).toBeDefined();
    return marker!;
  }

  async function renderAndValidateInvalidSql() {
    const view = render(<ValidationHarness onErrorClick={onErrorClick} />);
    fireEvent.click(view.getByRole("button", { name: "Run invalid SQL" }));

    await waitFor(
      () => expect(view.getByTestId("hook-error-count")).toHaveTextContent("1"),
      { timeout: 20000 },
    );
    return view;
  }

  it("renders parser-provided line/column, message, and severity in the Problems list", async () => {
    const marker = expectedMarkerFor(INVALID_SQL);
    const view = await renderAndValidateInvalidSql();

    // Editor-side mapping: the hook applied the marker to the Monaco model with
    // exactly the parser-provided positions.
    expect(setModelMarkers).toHaveBeenCalledWith(
      modelStub,
      "sql-syntax-validator",
      [
        expect.objectContaining({
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          message: marker.message,
          severity: 8,
          source: marker.source,
        }),
      ],
    );

    // Open the real Problems tab of the real result panel.
    fireEvent.click(view.getByRole("button", { name: /Problems/ }));

    // The rendered row must show the exact parser-provided location, message,
    // and severity visual text.
    const row = view.getByRole("button", {
      name: `Problem at ${marker.startLineNumber}:${marker.startColumn}: ${marker.message}`,
    });
    expect(
      view.getByText(`[${marker.startLineNumber}:${marker.startColumn}]`),
    ).toBeInTheDocument();
    expect(view.getByText(marker.message)).toBeInTheDocument();
    expect(view.getByText("Error")).toBeInTheDocument();
    expect(row).toBeInTheDocument();
  });

  it("activates a problem row via click, Enter, and Space onto the exact position", async () => {
    const marker = expectedMarkerFor(INVALID_SQL);
    const view = await renderAndValidateInvalidSql();

    fireEvent.click(view.getByRole("button", { name: /Problems/ }));
    const row = view.getByRole("button", {
      name: `Problem at ${marker.startLineNumber}:${marker.startColumn}: ${marker.message}`,
    });

    fireEvent.click(row);
    expect(onErrorClick).toHaveBeenCalledTimes(1);
    expect(onErrorClick).toHaveBeenLastCalledWith(
      marker.startLineNumber,
      marker.startColumn,
    );

    fireEvent.keyDown(row, { key: "Enter" });
    expect(onErrorClick).toHaveBeenCalledTimes(2);
    expect(onErrorClick).toHaveBeenLastCalledWith(
      marker.startLineNumber,
      marker.startColumn,
    );

    fireEvent.keyDown(row, { key: " " });
    expect(onErrorClick).toHaveBeenCalledTimes(3);
    expect(onErrorClick).toHaveBeenLastCalledWith(
      marker.startLineNumber,
      marker.startColumn,
    );
  });

  it("clears the Problems list, footer counters, and editor markers for valid SQL", async () => {
    const view = await renderAndValidateInvalidSql();
    fireEvent.click(view.getByRole("button", { name: /Problems/ }));
    expect(view.queryByText("No Problems")).not.toBeInTheDocument();

    fireEvent.click(view.getByRole("button", { name: "Run valid SQL" }));

    await waitFor(
      () => expect(view.getByTestId("hook-error-count")).toHaveTextContent("0"),
      { timeout: 20000 },
    );

    // Problems list falls back to its empty state.
    await waitFor(() =>
      expect(view.getByText("No Problems")).toBeInTheDocument(),
    );
    expect(
      view.getByText("✓ Your SQL syntax is valid"),
    ).toBeInTheDocument();

    // Editor markers were cleared on the Monaco model as well.
    await waitFor(() =>
      expect(setModelMarkers).toHaveBeenLastCalledWith(
        modelStub,
        "sql-syntax-validator",
        [],
      ),
    );
  });
});
