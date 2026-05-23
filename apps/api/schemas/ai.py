"""
ai.py

Pydantic request schemas for AI Assistant endpoints.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel


class AddModelRequest(BaseModel):
    name: str
    modelId: str
    provider: str = "Google"
    description: Optional[str] = None


class GenerateSqlRequest(BaseModel):
    prompt: str
    databaseId: str
    schema_name: Optional[str] = None
    modelId: Optional[str] = None


class ExplainSqlRequest(BaseModel):
    sql: str
    modelId: Optional[str] = None


class OptimizeSqlRequest(BaseModel):
    sql: str
    databaseId: str
    schema_name: Optional[str] = None
    modelId: Optional[str] = None


class FixSqlRequest(BaseModel):
    sql: str
    error: str
    databaseId: str
    schema_name: Optional[str] = None
    modelId: Optional[str] = None


class CompleteSqlRequest(BaseModel):
    databaseId: str
    schema_name: Optional[str] = None
    prefix: str = ""
    suffix: str = ""
    modelId: Optional[str] = None


class ExecuteAgentRequest(BaseModel):
    prompt: str
    databaseId: str
    schema_name: Optional[str] = None
    conversationId: Optional[str] = None
    modelId: Optional[str] = None


class ValidateSqlRequest(BaseModel):
    sql: str
    databaseId: Optional[str] = None
    dialect: Optional[str] = None
    allowWrite: bool = False
    maxPreviewRows: int = 500


class StreamChatRequest(BaseModel):
    text: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    databaseId: str
    schema_name: Optional[str] = None
    conversationId: Optional[str] = None
    modelId: Optional[str] = None
    taskKey: Optional[str] = None


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    isPinned: Optional[bool] = None


class SubmitFeedbackRequest(BaseModel):
    messageId: str
    rating: int
    correction: Optional[str] = ""
    conversationId: Optional[str] = None


class AITaskAssignmentRequest(BaseModel):
    taskKey: str
    modelId: Optional[str] = None
    fallbackModelId: Optional[str] = None
    databaseId: Optional[str] = None
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    enabled: bool = True


class SaveAITaskAssignmentsRequest(BaseModel):
    assignments: List[AITaskAssignmentRequest]


class CreateAIRouterTermRequest(BaseModel):
    termSetKey: str
    term: str
    language: str = "any"
    matchType: str = "phrase"
    weight: float = 1.0
    isNegative: bool = False
    enabled: bool = True
    notes: Optional[str] = None


class UpdateAIRouterTermRequest(BaseModel):
    term: Optional[str] = None
    language: Optional[str] = None
    matchType: Optional[str] = None
    weight: Optional[float] = None
    isNegative: Optional[bool] = None
    enabled: Optional[bool] = None
    notes: Optional[str] = None
