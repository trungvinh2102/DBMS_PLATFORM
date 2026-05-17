---
name: commit-convention
description: Use when preparing git commits, grouping staged changes, writing Conventional Commit messages, or committing repository changes safely without mixing unrelated work.
license: MIT
compatibility: Requires git
allowed-tools: Bash(git:*) Read
metadata:
  author: QurioDB-Team
  version: "1.0.0"
---

# Commit Convention

Use this skill whenever the user asks to commit, prepare commits, split changes, or write commit messages.

## Commit Style

Use Conventional Commits:

```text
<type>(<scope>): <summary>
```

Examples:

```text
feat(ai): route generation through LangChain
fix(sqllab): preserve streamed tool call history
test(api): cover prompt safety contracts
docs(research): record system prompt upgrade findings
chore(skills): add commit convention skill
```

## Types

- `feat`: user-visible feature or capability.
- `fix`: bug fix or behavioral correction.
- `refactor`: code restructuring without intended behavior change.
- `perf`: performance improvement.
- `test`: test-only change.
- `docs`: documentation-only change.
- `style`: formatting-only change.
- `build`: dependency, packaging, or build-system change.
- `ci`: CI/CD change.
- `chore`: maintenance, tooling, repo metadata, or skills/rules.
- `revert`: revert a previous commit.

## Scope

Prefer a short product or package scope:

- `api`
- `ai`
- `sqllab`
- `desktop`
- `web`
- `docs`
- `skills`
- `tests`
- `deps`

If a commit touches multiple areas, choose the behavior owner rather than listing every folder. For example, backend streaming plus SQL Lab parsing can use `ai` if the main behavior is AI chat history.

## Summary Rules

- Use imperative mood: `add`, `fix`, `route`, `preserve`, `remove`.
- Keep the first line under 72 characters when practical.
- Use lowercase after the scope unless the noun is a product name.
- Do not end the summary with a period.
- Mention the behavior, not the file operation.

## Grouping Rules

- Stage intentionally with explicit paths.
- Keep unrelated user changes out of the commit.
- Prefer multiple small commits when changes have different purposes.
- Combine code and tests in the same commit when the tests validate that code.
- Combine docs with code only when the docs are inseparable from the behavior change.
- Use `git diff --cached --name-only` before committing.

## Safety Checklist

Before committing:

1. Run `git status --short`.
2. Inspect relevant diffs with `git diff -- <paths>`.
3. Stage explicit paths only.
4. Verify staged files with `git diff --cached --name-only`.
5. Run relevant tests or explain why they were not run.
6. Commit with a Conventional Commit message.
7. Report the commit hash and any remaining uncommitted files.

## Body And Footers

Use a body when a change needs context:

```text
feat(ai): route generation through LangChain

Removes the native Gemini fallback so provider handling stays centralized
through the LangChain runtime.
```

Use footers for breaking changes or issue references:

```text
BREAKING CHANGE: removes google-generativeai as a direct backend dependency
Refs: #123
```

Only mark `BREAKING CHANGE` when callers, package users, or deployment flows must change.
