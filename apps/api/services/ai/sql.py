"""
sql.py

SQL task specialized service for SQL generation, explanation, optimization, and error fixing.
"""
import logging
from typing import Dict, Any, Optional

from .base import BaseAIService
from .context import schema_context_service
from ..prompts import (
    get_sql_generation_prompt,
    get_sql_explanation_prompt,
    get_sql_optimization_prompt,
    get_sql_fix_prompt
)

logger = logging.getLogger(__name__)

class SqlAIService(BaseAIService):
    """Specialized in standard Text-to-SQL tasks."""

    def generate_sql(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Generates a SQL query using RAG-based context pruning."""
        self._save_chat("user", prompt, user_id, db_id)
        
        context = schema_context_service.format_schema_context(db_id, schema, intent=prompt)
        system_prompt = get_sql_generation_prompt(context)
        
        response = self._generate_response(f"{system_prompt}\n\nUser Intent: {prompt}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to generate"}
            
        sql = self._extract_sql(str(response))
        self._save_chat("assistant", str(response), user_id, db_id)
        self._save_generated_query(sql, prompt, "AI Generated Query", user_id, db_id)
        
        return {"sql": sql}

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
        context = schema_context_service.format_schema_context(db_id, schema, intent=f"Optimize SQL: {sql}")
        system_prompt = get_sql_optimization_prompt(context)
        
        response = self._generate_response(f"{system_prompt}\n\nCURRENT SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to optimize"}
            
        optimized_sql = self._extract_sql(str(response))
        self._save_chat("assistant", str(response), user_id, db_id)
        self._save_generated_query(optimized_sql, f"Optimize: {sql}", str(response), user_id, db_id)

        return {"result": str(response), "sql": optimized_sql}

    def fix_sql(self, sql: str, error: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Analyzes a SQL error and provides a corrected version."""
        self._save_chat("user", f"Fix SQL: {sql}\nError: {error}", user_id, db_id)
        context = schema_context_service.format_schema_context(db_id, schema, intent=f"Fix SQL: {sql} with error: {error}")
        system_prompt = get_sql_fix_prompt(error, context)
        
        response = self._generate_response(f"{system_prompt}\n\nFAILED SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response or response.startswith("AI Error:"):
            return {"error": response or "Failed to fix"}
            
        fixed_sql = self._extract_sql(str(response))
        self._save_chat("assistant", str(response), user_id, db_id)
        self._save_generated_query(fixed_sql, f"Fix: {error}", str(response), user_id, db_id)

        return {"result": str(response), "sql": fixed_sql}
