/**
 * @file redis-validator.ts
 * @description Manual Redis command syntax validator.
 */

import { MarkerSeverity } from "../types";
import type { ValidationMarker, ValidationResult } from "../types";

const REDIS_COMMAND_ARGS: Record<string, { min: number; max: number; msg?: string }> = {
  get: { min: 1, max: 1, msg: "GET requires exactly 1 argument" },
  set: { min: 2, max: 10, msg: "SET requires at least 2 arguments (key, value)" },
  del: { min: 1, max: 100, msg: "DEL requires at least 1 key" },
  exists: { min: 1, max: 1, msg: "EXISTS requires exactly 1 key" },
  expire: { min: 2, max: 2, msg: "EXPIRE requires exactly 2 arguments (key, seconds)" },
  type: { min: 1, max: 1, msg: "TYPE requires exactly 1 key" },
  ttl: { min: 1, max: 1, msg: "TTL requires exactly 1 key" },
  
  // Hash
  hget: { min: 2, max: 2, msg: "HGET requires exactly 2 arguments (key, field)" },
  hset: { min: 3, max: 50, msg: "HSET requires at least 3 arguments (key, field, value)" },
  hgetall: { min: 1, max: 1, msg: "HGETALL requires exactly 1 key" },
  hdel: { min: 2, max: 100, msg: "HDEL requires at least 2 arguments (key, field)" },
  
  // List
  lrange: { min: 3, max: 3, msg: "LRANGE requires exactly 3 arguments (key, start, stop)" },
  lpush: { min: 2, max: 100, msg: "LPUSH requires at least 2 arguments (key, value)" },
  rpush: { min: 2, max: 100, msg: "RPUSH requires at least 2 arguments (key, value)" },
  
  // Set
  sadd: { min: 2, max: 100, msg: "SADD requires at least 2 arguments (key, member)" },
  smembers: { min: 1, max: 1, msg: "SMEMBERS requires exactly 1 key" },
  
  // Sorted Set
  zadd: { min: 3, max: 100, msg: "ZADD requires at least 3 arguments (key, score, member)" },
  zrange: { min: 3, max: 5, msg: "ZRANGE requires at least 3 arguments (key, start, stop)" },
};

export function validateRedis(code: string): ValidationResult {
  const lines = code.split("\n");
  const markers: ValidationMarker[] = [];
  const startTime = Date.now();

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return; // Skip empty and comments

    // Basic tokenization (handle simple quotes)
    const tokens: string[] = [];
    let currentToken = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < trimmedLine.length; i++) {
      const char = trimmedLine[i];
      if ((char === '"' || char === "'") && (i === 0 || trimmedLine[i-1] !== "\\")) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
        } else {
          currentToken += char;
        }
      } else if (char === " " && !inQuotes) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = "";
        }
      } else {
        currentToken += char;
      }
    }
    if (currentToken) tokens.push(currentToken);

    if (tokens.length === 0) return;

    const cmd = tokens[0].toLowerCase();
    
    // Check if SELECT * FROM key (SQL style supported by our proxy)
    if (cmd === "select") {
      if (tokens.length < 4 || tokens[1] !== "*" || tokens[2].toLowerCase() !== "from") {
        markers.push({
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
          message: "Unsupported SQL syntax in Redis mode. Use 'SELECT * FROM key' or native Redis commands.",
          severity: MarkerSeverity.Warning,
          source: "redis-validator"
        });
      }
      return;
    }

    const rule = REDIS_COMMAND_ARGS[cmd];
    if (rule) {
      const argCount = tokens.length - 1;
      if (argCount < rule.min || argCount > rule.max) {
        markers.push({
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
          message: rule.msg || `Invalid number of arguments for command ${cmd.toUpperCase()}`,
          severity: MarkerSeverity.Error,
          source: "redis-validator"
        });
      }
    } else {
      // Unknown command check
      // For now, let's keep it as a warning so we don't block new commands
      // but if it's clearly SQL that isn't SELECT *, mark it as error
      const commonSql = ["insert", "update", "delete", "drop", "create", "alter"];
      if (commonSql.includes(cmd)) {
        markers.push({
          startLineNumber: index + 1,
          startColumn: 1,
          endLineNumber: index + 1,
          endColumn: line.length + 1,
          message: `SQL command '${cmd.toUpperCase()}' is not supported for Redis. Use Redis native commands or 'SELECT * FROM key'.`,
          severity: MarkerSeverity.Error,
          source: "redis-validator"
        });
      }
    }
  });

  return {
    isValid: markers.length === 0,
    markers,
    validationTime: Date.now() - startTime,
  };
}
