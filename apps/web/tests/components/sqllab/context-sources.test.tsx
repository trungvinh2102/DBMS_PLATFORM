/**
 * @file context-sources.test.tsx
 * @description Unit tests for user-readable AI retrieval context sources.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContextSources } from "@/app/sqllab/components/ai/ContextSources";

describe("ContextSources", () => {
  it("hides generic schema-only citations that do not identify an object", () => {
    const { container } = render(
      <ContextSources
        isDark={false}
        citations={[
          {
            id: "rag:database_schema:1",
            sourceType: "database_schema",
            title: "public schema",
            score: 0.032,
          },
        ]}
      />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/sources/i)).not.toBeInTheDocument();
  });

  it("groups useful schema citations by table and hides raw score text", () => {
    render(
      <ContextSources
        isDark={false}
        citations={[
          {
            id: "database:1/schema:public/table:orders#1",
            sourceType: "database_schema",
            title: "public schema",
            objectName: "orders",
            schemaName: "public",
            score: 0.032,
            reasons: ["matched table orders"],
          },
          {
            id: "database:1/schema:public/table:orders#2",
            sourceType: "database_schema",
            title: "public schema",
            objectName: "orders",
            schemaName: "public",
            score: 0.031,
          },
        ]}
      />,
    );

    expect(screen.getByText("Context used")).toBeInTheDocument();
    expect(screen.getByText("public.orders")).toBeInTheDocument();
    expect(screen.getByText("schema")).toBeInTheDocument();
    expect(screen.queryByText("0.032")).not.toBeInTheDocument();
    expect(screen.getByText("1 reference")).toBeInTheDocument();
  });
});
