/**
 * @file nosql-builders.test.ts
 * @description Regression tests for SQL Lab NoSQL query builder helpers.
 */

import { describe, expect, it } from "vitest";
import {
  buildMongoAggregationQuery,
  buildRedisReadCommand,
  buildRedisScanCommand,
} from "./nosql-builders";

describe("nosql-builders", () => {
  it("builds a valid MongoDB aggregate pipeline", () => {
    const query = buildMongoAggregationQuery("analytics", "orders", [
      { id: "1", operator: "$match", body: '{ "status": "paid" }' },
      { id: "2", operator: "$group", body: '{ "_id": "$customerId", "total": { "$sum": "$amount" } }' },
    ]);

    expect(query).toContain("analytics.orders.aggregate");
    expect(query).toContain('"$match"');
    expect(query).toContain('"$group"');
  });

  it("uses db as the MongoDB shell database alias when schema is public", () => {
    const query = buildMongoAggregationQuery("public", "users", [
      { id: "1", operator: "$limit", body: "10" },
    ]);

    expect(query.startsWith("db.users.aggregate")).toBe(true);
  });

  it("builds Redis read commands by key type", () => {
    expect(buildRedisReadCommand("users:1", "hash")).toBe('HGETALL "users:1"');
    expect(buildRedisReadCommand("events", "stream")).toBe('XRANGE "events" - + COUNT 100');
    expect(buildRedisReadCommand("queue", "auto")).toBe('GET "queue"');
  });

  it("normalizes Redis scan commands", () => {
    expect(buildRedisScanCommand("", 0)).toBe('SCAN 0 MATCH "*" COUNT 100');
    expect(buildRedisScanCommand("user:*", 25)).toBe('SCAN 0 MATCH "user:*" COUNT 25');
  });
});
