/**
 * @file monaco-editor-theme.test.tsx
 * @description Regression tests for the SQLEditor Monaco theme selection.
 *
 * The `Editor` component must receive the custom QurioDB theme names
 * (`quriodb-dark` / `quriodb-light`) — never built-in `vs` / `vs-dark` — and
 * both registered custom themes must style Monaco's suggestion widget
 * (`No suggestions.` popup included) so it matches the active color mode.
 */

import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const { definedThemes, editorProps, themeState, monacoStub } = vi.hoisted(
  () => {
    const definedThemes = new Map<string, { colors: Record<string, string> }>();
    const editorProps: Record<string, unknown> = {};
    const themeState = { resolvedTheme: "dark" as string };
    const monacoStub = {
      editor: {
        defineTheme: (
          name: string,
          data: { colors: Record<string, string> },
        ) => {
          definedThemes.set(name, JSON.parse(JSON.stringify(data)));
        },
        setTheme: () => {},
      },
    };
    return { definedThemes, editorProps, themeState, monacoStub };
  },
);

// SQLEditor pulls in @monaco-editor/react transitively; record the props it
// passes to the Editor and route `beforeMount` through a minimal Monaco stub
// so `defineThemes` runs without loading real Monaco into jsdom.
vi.mock("@monaco-editor/react", () => ({
  default: (props: Record<string, unknown>) => {
    Object.assign(editorProps, props);
    const beforeMount = props.beforeMount as
      | ((monaco: unknown) => void)
      | undefined;
    beforeMount?.(monacoStub);
    return null;
  },
  loader: {},
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: themeState.resolvedTheme,
    setTheme: () => {},
  }),
}));

// useEditorValidation -> validationService pulls in dt-sql-parser (antlr4ng is
// not resolvable in the test environment); stub the parser entry points.
vi.mock("@/lib/monaco/validationService", () => ({
  validateCode: vi.fn(() => ({
    isValid: true,
    markers: [],
    validationTime: 0,
  })),
  markersToErrorEntries: (markers: unknown[]) => markers,
}));

import { SQLEditor } from "@/lib/monaco/MonacoEditor";

/**
 * The ONLY `editorSuggestWidget.*` color ids registered by the installed
 * monaco-editor runtime (0.55.1,
 * `node_modules/monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestWidget.js`
 * lines 57-65). Monaco silently ignores unregistered color ids in
 * `defineTheme`, so the themes must not contain any other
 * `editorSuggestWidget.*` key (e.g. `noForeground` / `statusBarBackground`).
 */
export const SUPPORTED_SUGGEST_WIDGET_KEYS = [
  "editorSuggestWidget.background",
  "editorSuggestWidget.border",
  "editorSuggestWidget.foreground",
  "editorSuggestWidget.selectedForeground",
  "editorSuggestWidget.selectedIconForeground",
  "editorSuggestWidget.selectedBackground",
  "editorSuggestWidget.highlightForeground",
  "editorSuggestWidget.focusHighlightForeground",
] as const;

const DARK_WIDGET_COLORS = {
  "editorSuggestWidget.background": "#141414",
  "editorSuggestWidget.border": "#333333",
  "editorSuggestWidget.foreground": "#CCCCCC",
  "editorSuggestWidget.selectedBackground": "#264F78",
  "editorSuggestWidget.selectedIconForeground": "#CCCCCC",
  "editorSuggestWidget.focusHighlightForeground": "#3794FF",
};

const LIGHT_WIDGET_COLORS = {
  "editorSuggestWidget.background": "#FFFFFF",
  "editorSuggestWidget.border": "#E2E2E2",
  "editorSuggestWidget.foreground": "#333333",
  "editorSuggestWidget.selectedBackground": "#B3D7FF66",
  "editorSuggestWidget.selectedIconForeground": "#333333",
  "editorSuggestWidget.focusHighlightForeground": "#1a85ff",
};

function expectOnlySupportedSuggestWidgetKeys(
  colors: Record<string, string> | undefined,
) {
  const suggestKeys = Object.keys(colors ?? {}).filter((key) =>
    key.startsWith("editorSuggestWidget."),
  );
  for (const key of suggestKeys) {
    expect(SUPPORTED_SUGGEST_WIDGET_KEYS).toContain(key);
  }
}

describe("SQLEditor Monaco theme", () => {
  it("passes quriodb-dark (never a built-in name) when the app theme is dark", () => {
    themeState.resolvedTheme = "dark";
    render(<SQLEditor value="SELECT 1;" onChange={() => {}} />);

    expect(editorProps.theme).toBe("quriodb-dark");
    expect(String(editorProps.theme)).not.toMatch(
      /^(vs|vs-dark|hc-black|hc-light)$/,
    );
  });

  it("passes quriodb-light (never a built-in name) when the app theme is light", () => {
    themeState.resolvedTheme = "light";
    const { unmount } = render(
      <SQLEditor value="SELECT 1;" onChange={() => {}} />,
    );
    unmount();

    expect(editorProps.theme).toBe("quriodb-light");
    expect(String(editorProps.theme)).not.toMatch(
      /^(vs|vs-dark|hc-black|hc-light)$/,
    );
  });

  it("passes suggestLineHeight 24 so the empty popup encloses its message", () => {
    themeState.resolvedTheme = "dark";
    render(<SQLEditor value="SELECT 1;" onChange={() => {}} />);

    expect(editorProps.options).toMatchObject({ suggestLineHeight: 24 });
  });

  it("does not override the code editor line height", () => {
    themeState.resolvedTheme = "light";
    const { unmount } = render(
      <SQLEditor value="SELECT 1;" onChange={() => {}} />,
    );
    unmount();

    expect(editorProps.options).not.toHaveProperty("lineHeight");
  });

  it("registers the full suggestion-widget palette in quriodb-dark", () => {
    const darkTheme = definedThemes.get("quriodb-dark");
    expect(darkTheme).toBeDefined();
    expect(darkTheme?.colors).toMatchObject(DARK_WIDGET_COLORS);
  });

  it("registers the full suggestion-widget palette in quriodb-light", () => {
    const lightTheme = definedThemes.get("quriodb-light");
    expect(lightTheme).toBeDefined();
    expect(lightTheme?.colors).toMatchObject(LIGHT_WIDGET_COLORS);
  });

  it.each(["quriodb-dark", "quriodb-light"])(
    "uses only color ids supported by installed monaco-editor (%s)",
    (themeName) => {
      const theme = definedThemes.get(themeName);
      expect(theme).toBeDefined();
      // Monaco 0.55 ignores unregistered ids such as
      // `editorSuggestWidget.noForeground`; they must never be defined.
      expect(theme?.colors).not.toHaveProperty(
        "editorSuggestWidget.noForeground",
      );
      expectOnlySupportedSuggestWidgetKeys(theme?.colors);
    },
  );
});
