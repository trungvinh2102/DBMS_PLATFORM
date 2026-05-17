---
id: RESEARCH-001
type: research
status: draft
project: QurioDB
owner: "@QurioDB-Team"
tags: [ai, prompt-engineering, text-to-sql, structured-output, security]
linked-to: [[Project-Context]]
created: 2026-05-17
updated: 2026-05-17
---

# Analysis: System Prompt Upgrade

## Context

QurioDB uses AI prompts for SQL generation, SQL explanation, optimization, repair, and an autonomous execution agent. The current product target is desktop-first, with the FastAPI backend running locally as a Tauri sidecar. AI behavior must therefore be predictable, safe, and resilient without assuming a cloud orchestration layer.

Related context: [[Project-Context]]

## Research Sources

- OpenAI structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI prompting guide: https://developers.openai.com/api/docs/guides/prompting
- Anthropic prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Google Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- LangChain structured output: https://docs.langchain.com/oss/python/langchain/structured-output
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/

## Findings

1. Structured output should be enforced by runtime features where possible, not only by wording in the prompt. OpenAI, Gemini, and LangChain all support schema-based structured output patterns, with provider-native structured output considered more reliable when available.
2. Prompt instructions still matter for task policy, ambiguity handling, safety boundaries, language, and examples. OpenAI recommends keeping overall role and tone in system instructions, while task-specific details can remain in user messages.
3. Complex prompts benefit from clear sectioning. Anthropic recommends separating instructions, context, examples, and inputs with explicit structure to reduce misinterpretation.
4. User input and retrieved context must be treated as untrusted. OWASP identifies prompt injection and insecure/improper output handling as core LLM application risks.
5. Text-to-SQL prompts need schema grounding. For QurioDB this means the prompt must tell the model to use only tables, columns, relationships, and dialect details present in retrieved schema context.
6. Prompt-only SQL safety is not a sufficient security boundary. The prompt should reject unsafe SQL, but execution code should also validate generated SQL before running it.

## Current Prompt Gaps

- Persona wording was theatrical and less product-specific.
- Safety rules covered only a few destructive operations.
- Agent JSON contract did not define non-executing response shapes clearly.
- Prompt injection boundaries were not explicit.
- Ambiguity behavior was under-specified, increasing hallucination risk.
- The streaming prompt requested "thinking" without clarifying that it should be a concise user-visible summary rather than hidden chain-of-thought.

## Implemented Prompt Direction

- Reframed the assistant as QurioDB's database copilot/agent.
- Added trust boundaries for system instructions, schema context, user input, conversation history, SQL comments, data values, and error messages.
- Added schema grounding and ambiguity behavior.
- Expanded SQL safety policy to include DDL, broad DML, multiple statements, and sensitive-data requests.
- Preserved existing streaming markers: `<thinking>`, `<confidence>`, SQL code block, and `### ANALYSIS`.
- Clarified that `<thinking>` is a concise user-visible reasoning summary.
- Clarified agent response types: `sql_result`, `success`, `clarification`, and `error`.
- Added tests to prevent accidental removal of key prompt contracts.

## Recommended Next Steps

1. Add deterministic SQL validation before execution in `AgentAIService._execute_sql_internal`.
2. Introduce Pydantic response schemas for agent output and provider-native structured output where supported.
3. Add AI evaluation cases for prompt injection, ambiguity, dialect mismatch, schema hallucination, and unsafe SQL.
4. Version prompt templates so changes can be compared against LangSmith traces or local evaluation results.
