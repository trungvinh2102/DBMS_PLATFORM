import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorValidation } from "@/lib/monaco/useEditorValidation";
import { MarkerSeverity } from "@/lib/monaco/types";

const { validateCodeMock } = vi.hoisted(() => ({ validateCodeMock: vi.fn() }));

vi.mock("@/lib/monaco/validationService", async () => {
  return {
    validateCode: validateCodeMock,
    markersToErrorEntries: (markers: Array<{ startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; message: string; severity: MarkerSeverity }>) =>
      markers.map((marker, index) => ({
        id: `error-${index}-${marker.startLineNumber}-${marker.startColumn}`,
        line: marker.startLineNumber,
        column: marker.startColumn,
        endLine: marker.endLineNumber,
        endColumn: marker.endColumn,
        message: marker.message,
        severity: marker.severity,
        severityLabel: marker.severity === MarkerSeverity.Error ? "Error" : "Warning",
      })),
  };
});

function createMonacoRefs() {
  const model = {};
  const editor = { getModel: vi.fn(() => model) };
  const setModelMarkers = vi.fn();
  const monaco = {
    MarkerSeverity: {
      Error: 8,
      Warning: 4,
      Info: 2,
      Hint: 1,
    },
    editor: { setModelMarkers },
  };

  return {
    monacoRef: { current: monaco } as never,
    editorRef: { current: editor } as never,
    model,
    setModelMarkers,
  };
}

describe("useEditorValidation deferred scheduling", () => {
  let idleCallbacks: Array<() => void>;
  const requestIdleCallbackMock = vi.fn((callback: () => void) => {
    idleCallbacks.push(callback);
    return idleCallbacks.length;
  });
  const cancelIdleCallbackMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    idleCallbacks = [];
    validateCodeMock.mockReset();
    vi.stubGlobal("requestIdleCallback", requestIdleCallbackMock);
    vi.stubGlobal("cancelIdleCallback", cancelIdleCallbackMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("debounces validation and schedules parser work during idle time", () => {
    validateCodeMock.mockReturnValue({ isValid: true, markers: [], validationTime: 4 });
    const refs = createMonacoRefs();
    const { result } = renderHook(() =>
      useEditorValidation({ ...refs, language: "sql", debounceMs: 300 }),
    );

    act(() => {
      result.current.validate("SELECT 1");
      vi.advanceTimersByTime(299);
    });
    expect(validateCodeMock).not.toHaveBeenCalled();
    expect(requestIdleCallbackMock).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(validateCodeMock).not.toHaveBeenCalled();
    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1);

    act(() => idleCallbacks[0]());
    expect(validateCodeMock).toHaveBeenCalledWith("SELECT 1", "sql", undefined);
  });

  it("falls back to a deferred timer when idle callbacks are unavailable", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    validateCodeMock.mockReturnValue({ isValid: true, markers: [], validationTime: 4 });
    const refs = createMonacoRefs();
    const { result } = renderHook(() =>
      useEditorValidation({ ...refs, language: "sql", debounceMs: 10 }),
    );

    act(() => {
      result.current.validate("SELECT 1");
      vi.advanceTimersByTime(10);
    });
    expect(validateCodeMock).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());
    expect(validateCodeMock).toHaveBeenCalledWith("SELECT 1", "sql", undefined);
  });

  it("cancels pending debounce and idle work when newer code arrives", () => {
    validateCodeMock.mockReturnValue({ isValid: true, markers: [], validationTime: 4 });
    const refs = createMonacoRefs();
    const { result } = renderHook(() =>
      useEditorValidation({ ...refs, language: "sql", debounceMs: 300 }),
    );

    act(() => {
      result.current.validate("old");
      vi.advanceTimersByTime(300);
      result.current.validate("new");
    });
    expect(cancelIdleCallbackMock).toHaveBeenCalledWith(1);
    expect(validateCodeMock).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(2);
    act(() => idleCallbacks[1]());
    expect(validateCodeMock).toHaveBeenCalledWith("new", "sql", undefined);
  });

  it("ignores stale idle callbacks and only completes the latest code", () => {
    const onValidationComplete = vi.fn();
    validateCodeMock.mockImplementation((code: string) => ({
      isValid: code === "new",
      markers: code === "old" ? [{
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 2,
        message: "old",
        severity: MarkerSeverity.Error,
      }] : [],
      validationTime: 4,
    }));
    const refs = createMonacoRefs();
    const { result } = renderHook(() =>
      useEditorValidation({
        ...refs,
        language: "sql",
        debounceMs: 300,
        onValidationComplete,
      }),
    );

    act(() => {
      result.current.validate("old");
      vi.advanceTimersByTime(300);
      result.current.validate("new");
    });
    act(() => idleCallbacks[0]());
    expect(validateCodeMock).not.toHaveBeenCalled();
    expect(onValidationComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
      idleCallbacks[1]();
    });
    expect(onValidationComplete).toHaveBeenCalledTimes(1);
    expect(onValidationComplete).toHaveBeenCalledWith(expect.objectContaining({ isValid: true }));
  });

  it("cleans up pending work on unmount and preserves marker mapping", () => {
    const marker = {
      startLineNumber: 2,
      startColumn: 3,
      endLineNumber: 2,
      endColumn: 8,
      message: "invalid query",
      severity: MarkerSeverity.Warning,
      source: "sql-validator",
      code: "W001",
    };
    validateCodeMock.mockReturnValue({ isValid: false, markers: [marker], validationTime: 7 });
    const refs = createMonacoRefs();
    const { result, unmount } = renderHook(() =>
      useEditorValidation({ ...refs, language: "sql", debounceMs: 300 }),
    );

    act(() => {
      result.current.validate("SELECT");
      vi.advanceTimersByTime(300);
    });
    unmount();
    act(() => idleCallbacks[0]());

    expect(validateCodeMock).not.toHaveBeenCalled();
    expect(refs.setModelMarkers).toHaveBeenCalledWith(refs.model, "syntax-validator", []);

    const fresh = renderHook(() =>
      useEditorValidation({ ...refs, language: "sql", debounceMs: 0 }),
    );
    act(() => {
      fresh.result.current.validate("SELECT");
      vi.runAllTimers();
      idleCallbacks[idleCallbacks.length - 1]();
    });
    expect(fresh.result.current.markers).toEqual([marker]);
    expect(refs.setModelMarkers).toHaveBeenLastCalledWith(refs.model, "syntax-validator", [
      expect.objectContaining({
        startLineNumber: 2,
        message: "invalid query",
        severity: 4,
        source: "sql-validator",
        code: "W001",
      }),
    ]);
    fresh.unmount();
  });
});
