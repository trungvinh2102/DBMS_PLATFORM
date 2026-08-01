/**
 * @file ai-lifecycle.test.ts
 * @description Regression tests for the inactive AI render contract.
 */

import { describe, expect, it, vi } from "vitest";

import {
  areAIAssistantPropsEqual,
  type AIAssistantLab,
} from "@/app/sqllab/components/AIAssistant";

const lab = (overrides: Partial<AIAssistantLab> = {}): AIAssistantLab => ({
  selectedDS: "db-1",
  selectedSchema: "public",
  selectedDSType: "postgresql",
  sql: "SELECT 1;",
  error: null,
  fixSQLError: null,
  queryLimit: 500,
  setFixSQLError: vi.fn(),
  ...overrides,
});

const props = (overrides: Partial<Parameters<typeof areAIAssistantPropsEqual>[0]> = {}) => ({
  lab: lab(),
  active: false,
  showHistory: false,
  onShowHistoryChange: vi.fn(),
  newChatSignal: 0,
  ...overrides,
});

describe("AIAssistant inactive render contract", () => {
  it("ignores high-churn editor state while AI is inactive", () => {
    expect(
      areAIAssistantPropsEqual(
        props(),
        props({ lab: lab({ sql: "SELECT * FROM users;" }) }),
      ),
    ).toBe(true);
  });

  it("updates the AI subtree when active editor SQL changes", () => {
    expect(
      areAIAssistantPropsEqual(
        props({ active: true }),
        props({ active: true, lab: lab({ sql: "SELECT * FROM users;" }) }),
      ),
    ).toBe(false);
  });
});
