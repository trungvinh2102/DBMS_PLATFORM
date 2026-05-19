"""
sql.py

SQL task specialized service for SQL generation, explanation, optimization, and error fixing.
"""
import logging
from typing import Dict, Any, Optional

from .base import BaseAIService
from .feedback_context import feedback_context_service
from .prompt_contracts import build_rag_prompt
from .query_understanding import query_understanding_service
from .rag_context import rag_context_builder
from ..prompts import get_sql_explanation_prompt

logger = logging.getLogger(__name__)

class SqlAIService(BaseAIService):
    """Specialized in standard Text-to-SQL tasks."""

    def generate_sql(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Generates a SQL query using RAG-based context pruning and few-shot feedback."""
        self._save_chat("user", prompt, user_id, db_id)
        
        understanding = query_understanding_service.understand(prompt, [], db_id, schema)
        context_result = rag_context_builder.build(understanding, user_id=user_id)
        feedback = ""
        if user_id:
            feedback = feedback_context_service.get_feedback_context(db_id, user_id)
            
        system_prompt = build_rag_prompt(context_result.context, understanding, feedback_context=feedback)
        
        response = self._generate_response(f"{system_prompt}\n\nUser Intent: {prompt}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to generate"}
            
        sql = self._extract_sql(str(response))
        message_id = self._save_chat("assistant", str(response), user_id, db_id)
        self._save_retrieval_event(context_result.retrieval_trace, prompt, db_id, message_id=message_id)
        self._save_generated_query(sql, prompt, "AI Generated Query", user_id, db_id)
        
        return {
            "answer": str(response),
            "sql": sql,
            "retrievalTrace": context_result.retrieval_trace,
            "citations": context_result.citations,
            "warnings": context_result.warnings,
        }

    def explain_sql(self, sql: str, user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides a natural language explanation of a SQL query."""
        self._save_chat("user", f"Explain this SQL: {sql}", user_id)
        system_prompt = get_sql_explanation_prompt()
        
        response = self._generate_response(f"{system_prompt}\n\nSQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to explain"}
            
        self._save_chat("assistant", str(response), user_id)
        return {"explanation": str(response)}

    def optimize_sql(self, sql: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Refactors SQL for better performance based on schema context."""
        self._save_chat("user", f"Optimize this SQL: {sql}", user_id, db_id)
        prompt = f"Optimize SQL: {sql}"
        understanding = query_understanding_service.understand(prompt, [], db_id, schema)
        context_result = rag_context_builder.build(understanding, user_id=user_id)
        system_prompt = build_rag_prompt(context_result.context, understanding)
        
        response = self._generate_response(f"{system_prompt}\n\nCURRENT SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to optimize"}
            
        optimized_sql = self._extract_sql(str(response))
        message_id = self._save_chat("assistant", str(response), user_id, db_id)
        self._save_retrieval_event(context_result.retrieval_trace, sql, db_id, message_id=message_id)
        self._save_generated_query(optimized_sql, f"Optimize: {sql}", str(response), user_id, db_id)

        return {
            "answer": str(response),
            "result": str(response),
            "sql": optimized_sql,
            "retrievalTrace": context_result.retrieval_trace,
            "citations": context_result.citations,
            "warnings": context_result.warnings,
        }

    def fix_sql(self, sql: str, error: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Analyzes a SQL error and provides a corrected version."""
        self._save_chat("user", f"Fix SQL: {sql}\nError: {error}", user_id, db_id)
        prompt = f"Fix SQL: {sql} with error: {error}"
        understanding = query_understanding_service.understand(prompt, [], db_id, schema)
        context_result = rag_context_builder.build(understanding, user_id=user_id)
        system_prompt = build_rag_prompt(context_result.context, understanding)
        
        response = self._generate_response(f"{system_prompt}\n\nFAILED SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to fix"}
            
        fixed_sql = self._extract_sql(str(response))
        message_id = self._save_chat("assistant", str(response), user_id, db_id)
        self._save_retrieval_event(context_result.retrieval_trace, f"{sql}\n{error}", db_id, message_id=message_id)
        self._save_generated_query(fixed_sql, f"Fix: {error}", str(response), user_id, db_id)

        return {
            "answer": str(response),
            "result": str(response),
            "sql": fixed_sql,
            "retrievalTrace": context_result.retrieval_trace,
            "citations": context_result.citations,
            "warnings": context_result.warnings,
        }
