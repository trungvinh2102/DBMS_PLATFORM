"""
metadata.py

Pydantic schemas for database metadata and guarded administration actions.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AdminActionRequest(BaseModel):
    databaseId: str
    objectType: str
    objectName: str
    action: str
    schemaName: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)
    execute: bool = False
    confirmation: Optional[str] = None


class AdminActionResponse(BaseModel):
    action: str
    objectType: str
    objectName: str
    dialect: str
    sql: str
    riskLevel: str = "medium"
    requiresConfirmation: bool = True
    executed: bool = False
    columns: List[str] = Field(default_factory=list)
    data: List[Dict[str, Any]] = Field(default_factory=list)
    message: str
