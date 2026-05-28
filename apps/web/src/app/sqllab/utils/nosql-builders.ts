/**
 * @file nosql-builders.ts
 * @description Helpers for building MongoDB aggregation queries and Redis key commands in SQL Lab.
 */

export type MongoStage = {
  id: string;
  operator: string;
  body: string;
};

export type RedisKeyType = "auto" | "string" | "hash" | "list" | "set" | "zset" | "stream";

const REDIS_READ_COMMANDS: Record<Exclude<RedisKeyType, "auto">, string> = {
  string: "GET",
  hash: "HGETALL",
  list: "LRANGE",
  set: "SMEMBERS",
  zset: "ZRANGE",
  stream: "XRANGE",
};

export function buildMongoAggregationQuery(
  databaseName: string | null | undefined,
  collectionName: string,
  stages: MongoStage[],
) {
  const target = [databaseName && databaseName !== "public" ? databaseName : "db", collectionName]
    .filter(Boolean)
    .join(".");

  const stageDocuments = stages
    .map((stage) => ({ operator: stage.operator, body: stage.body.trim() }))
    .filter((stage) => Boolean(stage.body))
    .map((stage) => {
      const parsed = JSON.parse(stage.body);
      return JSON.stringify({ [stage.operator]: parsed }, null, 2);
    });

  return `${target}.aggregate([\n${stageDocuments.map((stage) => indent(stage, 2)).join(",\n")}\n])`;
}

export function buildRedisReadCommand(key: string, type: RedisKeyType = "auto") {
  const quotedKey = JSON.stringify(key);
  if (type === "auto") return `GET ${quotedKey}`;
  if (type === "list") return `LRANGE ${quotedKey} 0 99`;
  if (type === "zset") return `ZRANGE ${quotedKey} 0 99 WITHSCORES`;
  if (type === "stream") return `XRANGE ${quotedKey} - + COUNT 100`;
  return `${REDIS_READ_COMMANDS[type]} ${quotedKey}`;
}

export function buildRedisScanCommand(pattern: string, count = 100) {
  const normalizedPattern = pattern.trim() || "*";
  const normalizedCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 100;
  return `SCAN 0 MATCH ${JSON.stringify(normalizedPattern)} COUNT ${normalizedCount}`;
}

function indent(value: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}
