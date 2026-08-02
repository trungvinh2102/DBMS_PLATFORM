/**
 * @file ScriptTabView.test.tsx
 * @description Regression tests for Script Monaco theme selection.
 */

import React from "react";
import { render } from "../../test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { defineThemes, editorProps, setTheme } = vi.hoisted(() => ({
  defineThemes: vi.fn(),
  editorProps: vi.fn(),
  setTheme: vi.fn(),
}));

vi.mock("@monaco-editor/react", () => ({
  default: (props: any) => {
    editorProps(props);
    React.useEffect(() => {
      const monaco = { editor: { setTheme } };
      props.beforeMount?.(monaco);
      props.onMount?.({}, monaco);
    }, []);
    return <div data-testid="script-editor" />;
  },
}));

vi.mock("@/lib/monaco/themes", () => ({ defineThemes }));

describe("ScriptTabView", () => {
  beforeEach(() => {
    editorProps.mockReset();
    setTheme.mockReset();
    defineThemes.mockReset();
  });

  it.each(["quriodb-light", "quriodb-dark"] as const)(
    "uses %s as the only theme authority",
    async (monacoTheme) => {
      const { ScriptTabView } = await import(
        "@/app/sqllab/components/objectpanel/ScriptTabView"
      );

      const view = render(
        <ScriptTabView
          tableDDL="CREATE TABLE users (id INT);"
          monacoTheme={monacoTheme}
        />,
      );

      expect(editorProps).toHaveBeenCalledWith(
        expect.objectContaining({ theme: monacoTheme }),
      );
      expect(editorProps.mock.calls[0][0].theme).not.toBe("vs");
      expect(editorProps.mock.calls[0][0].theme).not.toBe("vs-dark");
      expect(defineThemes).toHaveBeenCalledTimes(1);
      expect(setTheme).not.toHaveBeenCalled();

      const nextTheme = monacoTheme === "quriodb-light" ? "quriodb-dark" : "quriodb-light";
      view.rerender(
        <ScriptTabView
          tableDDL="CREATE TABLE users (id INT);"
          monacoTheme={nextTheme}
        />,
      );

      expect(editorProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ theme: nextTheme }),
      );
      expect(setTheme).not.toHaveBeenCalled();
    },
  );
});
