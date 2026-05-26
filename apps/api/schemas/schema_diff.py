"""
schema_diff.py

Pydantic request and response schemas for schema comparison and migration script generation.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


DiffSeverity = Literal["safe", "review", "destructive"]
DiffObjectType = Literal["table", "column", "index", "foreign_key"]
DiffAction = Literal["add", "drop", "modify"]


class SchemaDiffRequest(BaseModel):
    sourceDatabaseId: str
    targetDatabaseId: str
    sourceSchema: Optional[str] = None
    targetSchema: Optional[str] = None
    includeDestructive: bool = False


class SchemaDiffOperation(BaseModel):
    id: str
    action: DiffAction
    objectType: DiffObjectType
    objectName: str
    tableName: Optional[str] = None
    severity: DiffSeverity
    summary: str
    source: Optional[Dict[str, Any]] = None
    target: Optional[Dict[str, Any]] = None
    sql: List[str] = Field(default_factory=list)


class SchemaDiffSummary(BaseModel):
    added: int
    removed: int
    modified: int
    safe: int
    review: int
    destructive: int
    total: int


class SchemaDiffResponse(BaseModel):
    sourceDatabaseId: str
    targetDatabaseId: str
    sourceSchema: Optional[str] = None
    targetSchema: Optional[str] = None
    targetDialect: str
    operations: List[SchemaDiffOperation]
    summary: SchemaDiffSummary
    migrationScript: str
    warnings: List[str] = Field(default_factory=list)
