# Research Analysis: ClickHouse Integration

## Overview
ClickHouse is a fast, open-source OLAP database management system. This document outlines the research findings for integrating ClickHouse into the DBMS_PLATFORM.

## Driver Selection
After evaluating `clickhouse-connect`, `clickhouse-driver`, and `clickhouse-sqlalchemy`, the recommendation is to use **`clickhouse-connect`**.

### Rationale
- **Official Support**: Maintained by ClickHouse, Inc.
- **Protocol**: Uses HTTP(S), which is more firewall-friendly than the native TCP protocol used by `clickhouse-driver`.
- **Automatic Connection Pooling**: Built-in support via `urllib3`.
- **Built-in SQLAlchemy Dialect**: Includes `clickhousedb` for seamless integration with projects already using SQLAlchemy.
- **Performance**: Optimized with Cython/C classes for data serialization.

## Key Technical Details
- **Default Port**: 8123 (HTTP) or 8443 (HTTPS).
- **URI Format**: `clickhouse://[user:password@]host[:port]/[database][?parameter=value]` (Usually mapped to `http` or `https` internally).
- **SQL Syntax Differences**:
    - `UPDATE` -> `ALTER TABLE ... UPDATE ... WHERE ...`
    - `DELETE` -> `ALTER TABLE ... DELETE WHERE ...`
    - No multi-statement transactions (ACID).
    - Extremely fast for analytical `SELECT` queries on large datasets.

## Integration Plan
1. **Backend**:
    - Add `clickhouse-connect` to `requirements.txt`.
    - Update `BaseDatabaseService` to support `clickhouse` type.
    - Implement `clickhouse` specific logic in `create_connection_engine`.
2. **Frontend**:
    - Add `clickhouse` to `DB_TYPES`, `DEFAULT_PORTS`, and `DB_URI_PROTOCOLS` in `constants.tsx`.
    - Update `ConnectionForm.tsx` placeholders.
    - (Optional) Enhance SQL editor with ClickHouse-specific autocomplete if available.

## Common Pitfalls
- **Small Inserts**: ClickHouse is not designed for frequent single-row inserts. Batching is essential.
- **Joins**: High memory usage for joins between large tables.
- **DML Performance**: `UPDATE` and `DELETE` are asynchronous and resource-intensive; they should be used sparingly.
