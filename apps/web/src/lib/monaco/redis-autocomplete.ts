/**
 * @file redis-autocomplete.ts
 * @description Redis command completion provider for Monaco Editor.
 */

import type { Monaco } from "@monaco-editor/react";
import type * as monacoEditor from "monaco-editor";

const REDIS_COMMANDS = [
  { label: "GET", detail: "GET key", documentation: "Get the value of a key" },
  { label: "SET", detail: "SET key value", documentation: "Set the string value of a key" },
  { label: "DEL", detail: "DEL key", documentation: "Delete a key" },
  { label: "EXISTS", detail: "EXISTS key", documentation: "Determine if a key exists" },
  { label: "EXPIRE", detail: "EXPIRE key seconds", documentation: "Set a key's time to live in seconds" },
  { label: "KEYS", detail: "KEYS pattern", documentation: "Find all keys matching the given pattern" },
  { label: "TYPE", detail: "TYPE key", documentation: "Determine the type stored at key" },
  { label: "TTL", detail: "TTL key", documentation: "Get the time to live for a key" },
  
  // Hash
  { label: "HGET", detail: "HGET key field", documentation: "Get the value of a hash field" },
  { label: "HSET", detail: "HSET key field value", documentation: "Set the string value of a hash field" },
  { label: "HGETALL", detail: "HGETALL key", documentation: "Get all the fields and values in a hash" },
  { label: "HDEL", detail: "HDEL key field", documentation: "Delete one or more hash fields" },
  { label: "HEXISTS", detail: "HEXISTS key field", documentation: "Determine if a hash field exists" },
  { label: "HKEYS", detail: "HKEYS key", documentation: "Get all the fields in a hash" },
  { label: "HLEN", detail: "HLEN key", documentation: "Get the number of fields in a hash" },
  
  // List
  { label: "LBALANCE", detail: "LBALANCE key", documentation: "Get list balance" },
  { label: "LPUSH", detail: "LPUSH key value", documentation: "Prepend one or multiple values to a list" },
  { label: "RPUSH", detail: "RPUSH key value", documentation: "Append one or multiple values to a list" },
  { label: "LPOP", detail: "LPOP key", documentation: "Remove and get the first element in a list" },
  { label: "RPOP", detail: "RPOP key", documentation: "Remove and get the last element in a list" },
  { label: "LLEN", detail: "LLEN key", documentation: "Get the length of a list" },
  { label: "LRANGE", detail: "LRANGE key start stop", documentation: "Get a range of elements from a list" },
  
  // Set
  { label: "SADD", detail: "SADD key member", documentation: "Add one or more members to a set" },
  { label: "SMEMBERS", detail: "SMEMBERS key", documentation: "Get all the members in a set" },
  { label: "SISMEMBER", detail: "SISMEMBER key member", documentation: "Determine if a given value is a member of a set" },
  { label: "SREM", detail: "SREM key member", documentation: "Remove one or more members from a set" },
  { label: "SCARD", detail: "SCARD key", documentation: "Get the number of members in a set" },

  // Sorted Set
  { label: "ZADD", detail: "ZADD key score member", documentation: "Add one or more members to a sorted set, or update its score if it already exists" },
  { label: "ZRANGE", detail: "ZRANGE key start stop [WITHSCORES]", documentation: "Return a range of members in a sorted set, by index" },
  { label: "ZREM", detail: "ZREM key member", documentation: "Remove one or more members from a sorted set" },
  { label: "ZCARD", detail: "ZCARD key", documentation: "Get the number of members in a sorted set" },
  { label: "ZSCORE", detail: "ZSCORE key member", documentation: "Get the score associated with the given member in a sorted set" },
  
  // Connection / Server
  { label: "PING", detail: "PING [message]", documentation: "Ping the server" },
  { label: "INFO", detail: "INFO [section]", documentation: "Get information and statistics about the server" },
  { label: "CONFIG", detail: "CONFIG GET parameter", documentation: "Get the value of a configuration parameter" },
  { label: "SELECT", detail: "SELECT index", documentation: "Change the selected database for the current connection" },
  { label: "FLUSHDB", detail: "FLUSHDB [ASYNC|SYNC]", documentation: "Remove all keys from the current database" },
  { label: "FLUSHALL", detail: "FLUSHALL [ASYNC|SYNC]", documentation: "Remove all keys from all databases" },
];

export const registerRedisAutocomplete = (
  monaco: Monaco,
  keysRef: React.MutableRefObject<string[]>,
) => {
  return monaco.languages.registerCompletionItemProvider("redis", {
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

      const suggestions: any[] = [];

      // Add Redis Commands
      REDIS_COMMANDS.forEach((cmd) => {
        suggestions.push({
          label: cmd.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          detail: cmd.detail,
          documentation: cmd.documentation,
          insertText: cmd.label,
          range: range,
          sortText: "1",
        });
      });

      // Add Keys (from tablesRef in SQLEditor)
      keysRef.current.forEach((key) => {
        suggestions.push({
          label: key,
          kind: monaco.languages.CompletionItemKind.Field,
          detail: "Redis Key",
          insertText: key,
          range: range,
          sortText: "2",
        });
      });

      return { suggestions };
    },
  });
};
