"""
connection.py

Pydantic request and response schemas for database connection endpoints.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ConnectionBaseRequest(BaseModel):
    databaseName: Optional[str] = None
    type: Optional[str] = None
    environment: Optional[str] = None
    isReadOnly: bool = False
    sslMode: Optional[str] = None
    sshConfig: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    config: Optional[Dict[str, Any]] = None


class CreateDatabaseRequest(ConnectionBaseRequest):
    databaseName: str
    type: str
    config: Dict[str, Any] = Field(default_factory=dict)


class UpdateDatabaseRequest(ConnectionBaseRequest):
    id: str


class TestConnectionRequest(BaseModel):
    # Frontend may send connection fields flat (host/port/user/...) instead of
    # nested under `config`; keep extras so the service fallback can read them.
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class DeleteDatabaseRequest(BaseModel):
    id: str


class ConnectLocalRequest(BaseModel):
    path: str
    type: str
    name: Optional[str] = None


class DatabaseConnectionResponse(BaseModel):
    id: str
    type: Optional[str] = None
    databaseName: Optional[str] = None
    environment: Optional[str] = None
    isReadOnly: Optional[bool] = None
    sslMode: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)


class MutationConnectionResponse(BaseModel):
    id: str
    databaseName: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)


class DeleteDatabaseResponse(BaseModel):
    success: bool


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
