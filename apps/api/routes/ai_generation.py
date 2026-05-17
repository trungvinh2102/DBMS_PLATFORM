"""
ai_generation.py

Routes for AI SQL generation, agent execution, autocomplete, and streaming chat.
"""

from fastapi import APIRouter, Depends, HTTPException

from schemas.ai import (
    CompleteSqlRequest,
    ExecuteAgentRequest,
    ExplainSqlRequest,
    FixSqlRequest,
    GenerateSqlRequest,
    OptimizeSqlRequest,
)
from services.ai.conversation_store import conversation_store
from services.ai_service import ai_service
from utils.auth_middleware import get_current_user

router = APIRouter()


@router.post("/generate-sql")
def generate_sql(data: GenerateSqlRequest, current_user: dict = Depends(get_current_user)):
    return _raise_or_return(ai_service.generate_sql(
        data.prompt,
        data.databaseId,
        data.schema_name,
        user_id=current_user.get("userId"),
        model_id=data.modelId,
    ))


@router.post("/explain-sql")
def explain_sql(data: ExplainSqlRequest, current_user: dict = Depends(get_current_user)):
    return _raise_or_return(ai_service.explain_sql(
        data.sql,
        user_id=current_user.get("userId"),
        model_id=data.modelId,
    ))


@router.post("/optimize-sql")
def optimize_sql(data: OptimizeSqlRequest, current_user: dict = Depends(get_current_user)):
    return _raise_or_return(ai_service.optimize_sql(
        data.sql,
        data.databaseId,
        data.schema_name,
        user_id=current_user.get("userId"),
        model_id=data.modelId,
    ))


@router.post("/fix-sql")
def fix_sql(data: FixSqlRequest, current_user: dict = Depends(get_current_user)):
    return _raise_or_return(ai_service.fix_sql(
        data.sql,
        data.error,
        data.databaseId,
        data.schema_name,
        user_id=current_user.get("userId"),
        model_id=data.modelId,
    ))


@router.post("/complete")
def autocomplete_sql(data: CompleteSqlRequest, current_user: dict = Depends(get_current_user)):
    if not data.prefix:
        return {"completion": ""}
    try:
        return ai_service.autocomplete_sql(
            db_id=data.databaseId,
            schema=data.schema_name,
            prefix=data.prefix,
            suffix=data.suffix,
            user_id=current_user.get("userId"),
            model_id=data.modelId,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/agent")
def execute_agent(data: ExecuteAgentRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("userId")
    conversation_id = conversation_store.ensure_conversation(
        user_id,
        data.databaseId,
        data.prompt,
        data.conversationId,
    )
    result = ai_service.execute_agent(
        data.prompt,
        data.databaseId,
        data.schema_name,
        user_id=user_id,
        model_id=data.modelId,
        conv_id=conversation_id,
    )
    if isinstance(result, dict):
        result["conversationId"] = conversation_id
    if result.get("type") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Unknown error"))
    return result


def _raise_or_return(result: dict):
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
