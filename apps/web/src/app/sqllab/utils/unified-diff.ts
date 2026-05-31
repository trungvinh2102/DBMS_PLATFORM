/**
 * @file unified-diff.ts
 * @description Build a Git-style unified line diff for SQL workspace previews.
 */

type DiffOp = "context" | "add" | "delete";

interface DiffLine {
  op: DiffOp;
  text: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

const DEFAULT_CONTEXT_LINES = 3;

export function buildUnifiedDiff(
  oldText: string,
  newText: string,
  filePath: string,
  contextLines = DEFAULT_CONTEXT_LINES,
) {
  if (oldText === newText) {
    return "";
  }

  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const diffLines = buildDiffLines(oldLines, newLines);
  const hunks = buildHunks(diffLines, contextLines);

  if (hunks.length === 0) {
    return "";
  }

  const output = [`--- a/${filePath}`, `+++ b/${filePath}`];
  for (const hunk of hunks) {
    output.push(
      `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`,
      ...hunk.lines.map(formatDiffLine),
    );
  }

  return output.join("\n");
}

function splitLines(text: string) {
  if (!text) return [];
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function buildDiffLines(oldLines: string[], newLines: string[]): DiffLine[] {
  const matrix = Array.from({ length: oldLines.length + 1 }, () =>
    Array(newLines.length + 1).fill(0),
  );

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      matrix[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? matrix[oldIndex + 1][newIndex + 1] + 1
          : Math.max(matrix[oldIndex + 1][newIndex], matrix[oldIndex][newIndex + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let oldLineNumber = 1;
  let newLineNumber = 1;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      lines.push({
        op: "context",
        text: oldLines[oldIndex],
        oldLine: oldLineNumber,
        newLine: newLineNumber,
      });
      oldIndex += 1;
      newIndex += 1;
      oldLineNumber += 1;
      newLineNumber += 1;
    } else if (matrix[oldIndex + 1][newIndex] >= matrix[oldIndex][newIndex + 1]) {
      lines.push({ op: "delete", text: oldLines[oldIndex], oldLine: oldLineNumber });
      oldIndex += 1;
      oldLineNumber += 1;
    } else {
      lines.push({ op: "add", text: newLines[newIndex], newLine: newLineNumber });
      newIndex += 1;
      newLineNumber += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    lines.push({ op: "delete", text: oldLines[oldIndex], oldLine: oldLineNumber });
    oldIndex += 1;
    oldLineNumber += 1;
  }

  while (newIndex < newLines.length) {
    lines.push({ op: "add", text: newLines[newIndex], newLine: newLineNumber });
    newIndex += 1;
    newLineNumber += 1;
  }

  return lines;
}

function buildHunks(lines: DiffLine[], contextLines: number): DiffHunk[] {
  const changedIndexes = lines
    .map((line, index) => (line.op === "context" ? -1 : index))
    .filter((index) => index >= 0);

  if (changedIndexes.length === 0) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  for (const changedIndex of changedIndexes) {
    const start = Math.max(0, changedIndex - contextLines);
    const end = Math.min(lines.length - 1, changedIndex + contextLines);
    const previous = ranges[ranges.length - 1];

    if (previous && start <= previous.end + 1) {
      previous.end = Math.max(previous.end, end);
    } else {
      ranges.push({ start, end });
    }
  }

  return ranges.map((range) => {
    const hunkLines = lines.slice(range.start, range.end + 1);
    const firstOldLine = hunkLines.find((line) => line.oldLine)?.oldLine;
    const firstNewLine = hunkLines.find((line) => line.newLine)?.newLine;
    const oldCount = hunkLines.filter((line) => line.op !== "add").length;
    const newCount = hunkLines.filter((line) => line.op !== "delete").length;

    return {
      oldStart: firstOldLine ?? 0,
      oldCount,
      newStart: firstNewLine ?? 0,
      newCount,
      lines: hunkLines,
    };
  });
}

function formatDiffLine(line: DiffLine) {
  const prefix = line.op === "add" ? "+" : line.op === "delete" ? "-" : " ";
  return `${prefix}${line.text}`;
}
