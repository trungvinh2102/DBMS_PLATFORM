/**
 * @file mongodb-autocomplete.ts
 * @description MongoDB completion provider for Monaco Editor.
 */

import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";

const MONGODB_SNIPPETS = [
  {
    label: "find",
    detail: "collection.find({ ... })",
    insertText: "find({ ${1:query} })",
    documentation: "Find documents in a collection",
  },
  {
    label: "aggregate",
    detail: "collection.aggregate([ ... ])",
    insertText:
      "aggregate([\n  { \\$match: { ${1:field}: ${2:value} } },\n  { \\$group: { _id: \"$${3:groupField}\", count: { \\$sum: 1 } } }\n])",
    documentation: "Perform aggregation on a collection",
  },
  {
    label: "insertOne",
    detail: "collection.insertOne({ ... })",
    insertText: "insertOne({ ${1:field}: ${2:value} })",
    documentation: "Insert a single document",
  },
  {
    label: "insertMany",
    detail: "collection.insertMany([ ... ])",
    insertText:
      "insertMany([\n  { ${1:field}: ${2:value} },\n  { ${1:field}: ${3:value} }\n])",
    documentation: "Insert multiple documents",
  },
  {
    label: "updateOne",
    detail: "collection.updateOne({ ... }, { $set: { ... } })",
    insertText:
      "updateOne(\n  { ${1:filterField}: ${2:filterValue} },\n  { \\$set: { ${3:updateField}: ${4:updateValue} } }\n)",
    documentation: "Update a single document",
  },
  {
    label: "updateMany",
    detail: "collection.updateMany({ ... }, { $set: { ... } })",
    insertText:
      "updateMany(\n  { ${1:filterField}: ${2:filterValue} },\n  { \\$set: { ${3:updateField}: ${4:updateValue} } }\n)",
    documentation: "Update multiple documents",
  },
  {
    label: "deleteOne",
    detail: "collection.deleteOne({ ... })",
    insertText: "deleteOne({ ${1:field}: ${2:value} })",
    documentation: "Delete a single document",
  },
  {
    label: "deleteMany",
    detail: "collection.deleteMany({ ... })",
    insertText: "deleteMany({ ${1:field}: ${2:value} })",
    documentation: "Delete multiple documents",
  },
];

const MONGODB_COMMANDS = [
  ...MONGODB_SNIPPETS.map((s) => s.label),
  "count",
  "distinct",
  "findOne",
  "bulkWrite",
  "estimatedDocumentCount",
  "countDocuments",
  "createIndex",
  "dropIndex",
  "listIndexes",
  "findOneAndDelete",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
];

const MONGODB_OPERATORS = [
  // Query Operators
  "$eq",
  "$gt",
  "$gte",
  "$in",
  "$lt",
  "$lte",
  "$ne",
  "$nin",
  "$and",
  "$not",
  "$nor",
  "$or",
  "$exists",
  "$type",
  "$expr",
  "$jsonSchema",
  "$mod",
  "$regex",
  "$text",
  "$where",
  "$all",
  "$elemMatch",
  "$size",
  "$bitsAllClear",
  "$bitsAllSet",
  "$bitsAnyClear",
  "$bitsAnySet",
  // Aggregation Stages
  "$addFields",
  "$bucket",
  "$bucketAuto",
  "$collStats",
  "$count",
  "$currentOp",
  "$facet",
  "$geoNear",
  "$graphLookup",
  "$group",
  "$indexStats",
  "$limit",
  "$listLocalSessions",
  "$listSessions",
  "$lookup",
  "$match",
  "$merge",
  "$out",
  "$project",
  "$redact",
  "$replaceRoot",
  "$replaceWith",
  "$sample",
  "$set",
  "$skip",
  "$sort",
  "$sortByCount",
  "$unwind",
  // Update Operators
  "$currentDate",
  "$inc",
  "$min",
  "$max",
  "$mul",
  "$rename",
  "$set",
  "$setOnInsert",
  "$unset",
  "$addToSet",
  "$pop",
  "$pull",
  "$push",
  "$pullAll",
  "$each",
  "$position",
  "$slice",
  "$sort",
  // Projection Operators
  "$",
  "$elemMatch",
  "$meta",
  "$slice",
];

export const registerMongoAutocomplete = (
  monaco: Monaco,
  collectionsRef: React.MutableRefObject<string[]>,
  fieldsRef: React.MutableRefObject<
    Array<{ table: string; name: string; type: string }>
  >,
) => {
  return monaco.languages.registerCompletionItemProvider("javascript", {
    triggerCharacters: [".", "$", '"', "'"],
    provideCompletionItems: (
      model: monacoEditor.editor.ITextModel,
      position: monacoEditor.Position,
    ) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // 1. Collection method completion: collection. | collection.fin
      const methodMatch = textUntilPosition.match(/([a-zA-Z0-9_-]+)\.$/);
      if (methodMatch) {
        const collectionName = methodMatch[1];
        // Only if it's a known collection
        if (collectionsRef.current.includes(collectionName)) {
          return {
            suggestions: MONGODB_COMMANDS.map((cmd) => {
              const snippet = MONGODB_SNIPPETS.find((s) => s.label === cmd);
              return {
                label: cmd,
                kind: snippet
                  ? monaco.languages.CompletionItemKind.Snippet
                  : monaco.languages.CompletionItemKind.Method,
                insertText: snippet ? snippet.insertText : cmd,
                insertTextRules: snippet
                  ? monaco.languages.CompletionItemInsertValueRule.InsertAsSnippet
                  : undefined,
                detail: snippet ? snippet.detail : `MongoDB ${cmd} command`,
                documentation: snippet ? snippet.documentation : undefined,
                range: range,
              };
            }),
          };
        }
      }

      // 2. Operators completion: { $ | { $ma
      const operatorMatch = textUntilPosition.match(/\$(\w*)$/);
      if (operatorMatch) {
        return {
          suggestions: MONGODB_OPERATORS.map((op) => ({
            label: op,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: op,
            range: {
              ...range,
              startColumn:
                word.startColumn > 1 ? word.startColumn - 1 : word.startColumn,
            },
          })),
        };
      }

      // 3. Field completion inside objects
      // This is harder to detect perfectly, but we can suggest fields if we are inside a find() or aggregate()
      // For now, let's just suggest all fields from the relevant collections if they are mentioned in the file
      const suggestions: any[] = [];

      // Add Collections
      collectionsRef.current.forEach((coll) => {
        suggestions.push({
          label: coll,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: coll,
          range: range,
          sortText: "1",
        });
      });

      // Add Operators (always useful in MQL)
      MONGODB_OPERATORS.forEach((op) => {
        suggestions.push({
          label: op,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: op,
          range: range,
          sortText: "2",
        });
      });

      // Add Fields
      fieldsRef.current.forEach((field) => {
        suggestions.push({
          label: field.name,
          kind: monaco.languages.CompletionItemKind.Field,
          detail: `${field.table} (${field.type})`,
          insertText: field.name,
          range: range,
          sortText: "3",
        });
      });

      return { suggestions };
    },
  });
};
