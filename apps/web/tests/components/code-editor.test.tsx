import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, renderHook } from "../test-utils";
import { CodeEditor } from "@/components/code-editor";
import { useTheme } from "next-themes";
import React from "react";

// Mock next-themes
vi.mock("next-themes", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useTheme: vi.fn(),
  };
});

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => {
  return {
    default: vi.fn().mockImplementation(({ value, onChange, onMount }) => {
      // Expose a way to test onMount
      const mountHandler = () => {
        if (onMount) {
          onMount({ setTheme: vi.fn() }, { editor: { setTheme: vi.fn() } });
        }
      };

      return (
        <div data-testid="editor-wrapper">
          <button data-testid="trigger-mount" onClick={mountHandler}>
            Mount
          </button>
          <textarea
            data-testid="monaco-mock"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </div>
      );
    }),
  };
});

describe("CodeEditor", () => {
  it("renders and handles changes", () => {
    (useTheme as any).mockReturnValue({ resolvedTheme: "light" });
    const onChange = vi.fn();
    render(<CodeEditor value='{"a": 1}' onChange={onChange} />);

    const textarea = screen.getByTestId("monaco-mock");
    expect(textarea).toHaveValue('{"a": 1}');

    fireEvent.change(textarea, { target: { value: '{"b": 2}' } });
    expect(onChange).toHaveBeenCalledWith('{"b": 2}');
  });

  it("handles editor mount and theme changes", () => {
    let currentTheme = "light";
    const setThemeMock = vi.fn();

    (useTheme as any).mockImplementation(() => ({
      resolvedTheme: currentTheme,
      setTheme: setThemeMock,
    }));

    const onChange = vi.fn();
    const { rerender } = render(<CodeEditor value="" onChange={onChange} />);

    // Trigger onMount
    fireEvent.click(screen.getByTestId("trigger-mount"));

    // Rerender with dark theme
    currentTheme = "dark";
    rerender(<CodeEditor value="" onChange={onChange} />);

    // Trigger onMount with dark theme
    fireEvent.click(screen.getByTestId("trigger-mount"));
  });
});
