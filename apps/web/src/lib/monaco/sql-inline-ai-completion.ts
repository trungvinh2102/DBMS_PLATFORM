/**
 * @file sql-inline-ai-completion.ts
 * @description Pure helper logic for deciding, trimming, and cleaning AI inline SQL completions.
 */

const AI_CONTEXT_BEFORE_CHARS = 4_000;
const AI_CONTEXT_AFTER_CHARS = 1_200;
const MIN_AI_PREFIX_CHARS = 5;
const SQL_INLINE_TRIGGER_PATTERN =
  /(?:\b(?:select|with|from|join|where|and|or|on|group\s+by|order\s+by|having|limit|insert\s+into|update|set|values)\b|[,.(=<>+-])\s*$/i;

export const AI_COMPLETION_DEBOUNCE_MS = 600;
export const AI_COMPLETION_CACHE_TTL_MS = 30_000;

export interface TrimmedInlineCompletionContext {
  prefix: string;
  suffix: string;
}

export const shouldRequestInlineSqlCompletion = ({
  prefix,
  currentLinePrefix,
  nextCharacter,
  isExplicit,
}: {
  prefix: string;
  currentLinePrefix: string;
  nextCharacter: string;
  isExplicit: boolean;
}): boolean => {
  const trimmedPrefix = prefix.trim();
  if (trimmedPrefix.length < MIN_AI_PREFIX_CHARS) return false;
  if (/[\w$]/.test(nextCharacter)) return false;
  if (isInsideBlockComment(prefix)) return false;
  if (currentLinePrefix.trimStart().startsWith("--")) return false;
  if (isInsideStringLiteral(prefix)) return false;
  if (isExplicit) return true;
  return SQL_INLINE_TRIGGER_PATTERN.test(currentLinePrefix.trimEnd());
};

export const trimInlineCompletionContext = (
  prefix: string,
  suffix: string,
): TrimmedInlineCompletionContext => ({
  prefix: prefix.slice(-AI_CONTEXT_BEFORE_CHARS),
  suffix: suffix.slice(0, AI_CONTEXT_AFTER_CHARS),
});

export const sanitizeInlineSqlCompletion = (
  prefix: string,
  completion: string,
): string => {
  let text = String(completion || "")
    .replace(/^```(?:sql)?/i, "")
    .replace(/```$/i, "")
    .replace(/\r\n/g, "\n")
    .trimStart()
    .trimEnd();

  const trimmedPrefix = prefix.trimEnd();
  if (!text || trimmedPrefix.endsWith(text.trim())) return "";

  const lastPrefixLine = trimmedPrefix.split("\n").pop() || "";
  if (text.toLowerCase().startsWith(lastPrefixLine.toLowerCase())) {
    text = text.slice(lastPrefixLine.length);
  }

  return text.trimStart();
};

const isInsideBlockComment = (prefix: string): boolean =>
  prefix.lastIndexOf("/*") > prefix.lastIndexOf("*/");

const isInsideStringLiteral = (prefix: string): boolean => {
  const withoutEscapedQuotes = prefix.replace(/''/g, "");
  const singleQuoteCount = (withoutEscapedQuotes.match(/'/g) || []).length;
  const doubleQuoteCount = (withoutEscapedQuotes.match(/"/g) || []).length;
  const backtickCount = (withoutEscapedQuotes.match(/`/g) || []).length;
  return (
    singleQuoteCount % 2 === 1 ||
    doubleQuoteCount % 2 === 1 ||
    backtickCount % 2 === 1
  );
};
