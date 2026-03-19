"""
ai_service.py

Service using Google Gemini for SQL generation, explanation, and optimization.
Provides a unified interface for AI-assisted database operations.
"""

import os
import re
import logging
from typing import Dict, Any, Optional

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from services.metadata import metadata_service

logger = logging.getLogger(__name__)

class AIService:
    """
    Integrates with Google Generative AI to provide SQL-related intelligence.
    Supports SQL generation, explanation, optimization, and error fixing.
    """

    def __init__(self):
        """Initializes the Gemini model with the GOOGLE_API_KEY environment variable."""
        api_key = os.getenv("GOOGLE_API_KEY")
        self.model_name = 'gemini-2.0-flash'
        self.model: Optional[Any] = None

        if HAS_GENAI and api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(self.model_name)
            logger.info(f"AIService initialized with model: {self.model_name}")
        else:
            self._log_init_error(api_key)

    def generate_sql(self, prompt: str, db_id: str, schema: str = "public") -> Dict[str, Any]:
        """Generates a SQL query based on natural language intent and schema context."""
        context = self._format_schema_context(db_id, schema)
        system_prompt = self._get_sql_generation_prompt(context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nUser Intent: {prompt}")
        if not response_text:
            return {"error": "AI response was empty or failed"}
            
        return {"sql": self._extract_sql(response_text)}

    def explain_sql(self, sql: str) -> Dict[str, Any]:
        """Provides a natural language explanation of the logic within a SQL query."""
        system_prompt = self._get_sql_explanation_prompt()
        
        response_text = self._generate_response(f"{system_prompt}\n\nSQL EXECUTABLE:\n{sql}")
        if not response_text:
            return {"error": "AI response was empty or failed"}
            
        return {"explanation": response_text}

    def optimize_sql(self, sql: str, db_id: str, schema: str = "public") -> Dict[str, Any]:
        """Refactors SQL for better performance based on schema context."""
        context = self._format_schema_context(db_id, schema)
        system_prompt = self._get_sql_optimization_prompt(context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nCURRENT SQL:\n{sql}")
        if not response_text:
            return {"error": "AI response was empty or failed"}
            
        return {
            "result": response_text, 
            "sql": self._extract_sql(response_text)
        }

    def fix_sql(self, sql: str, error: str, db_id: str, schema: str = "public") -> Dict[str, Any]:
        """Analyzes a SQL error and provides a corrected version of the query."""
        context = self._format_schema_context(db_id, schema)
        system_prompt = self._get_sql_fix_prompt(error, context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nFAILED SQL:\n{sql}")
        if not response_text:
            return {"error": "AI response was empty or failed"}
            
        return {
            "result": response_text, 
            "sql": self._extract_sql(response_text)
        }

    # --- Private Helper Methods ---

    def _log_init_error(self, api_key: Optional[str]):
        """Logs appropriate warning messages when AI features are disabled."""
        if not HAS_GENAI:
            logger.warning("google-generativeai package not installed. AI features disabled.")
        elif not api_key:
            logger.warning("GOOGLE_API_KEY not set in environment. AI features disabled.")

    def _generate_response(self, full_prompt: str) -> Optional[str]:
        """Internal helper to call the Gemini model safely."""
        if not self.model:
            logger.error("AI model not configured. Call ignored.")
            return None
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}", exc_info=True)
            return None

    def _extract_sql(self, text: str) -> str:
        """Parses the SQL code block out of the AI's markdown response."""
        match = re.search(r"```sql\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        match = re.search(r"```\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        return text.strip()

    def _format_schema_context(self, db_id: str, schema: str) -> str:
        """Constructs a text-based representation of the schema for the AI's context."""
        all_cols = metadata_service.get_all_columns(db_id, schema)
        if not all_cols:
            return "No schema metadata available."
            
        context = []
        # Limit tables to prevent context window overflow (top 30 tables)
        for t, cols in list(all_cols.items())[:30]:
            col_strs = [f"{c['name']} ({c['type']})" for c in cols]
            context.append(f'Table "{t}" {{\n  ' + ",\n  ".join(col_strs) + '\n}')
            
        return "\n\n".join(context)

    # --- Prompt Templates ---

    def _get_sql_generation_prompt(self, schema_context: str) -> str:
        return f"""
        You are an Elite AI SQL Architect (2026 Edition). Your goal is to synthesize high-performance, precision SQL queries.
        
        DATABASE KNOWLEDGE GRAPH:
        {schema_context}
        
        DIRECTIVES:
        - Output ONLY the optimized SQL query within a ```sql ... ``` block.
        - Ensure 100% compliance with requested business logic.
        - Use modern SQL features (CTEs, Window Functions) for better readability and performance.
        - Strictly enforce data security; only SELECT operations are permitted.
        """

    def _get_sql_explanation_prompt(self) -> str:
        return """
        You are a Database Logic Translator. Deconstruct the provided SQL query into a clear, high-level narrative for architects and developers.
        
        STRUCTURE:
        1. Purpose: What does this query achieve?
        2. Mechanisms: Break down JOINs, filters, and aggregations.
        3. Data Flow: Describe the transformation path from source to result.
        
        Use concise, premium professional language.
        """

    def _get_sql_optimization_prompt(self, schema_context: str) -> str:
        return f"""
        You are a Query Performance Guru. Refactor the provided SQL for maximum efficiency and execution speed.
        
        SCHEMA CONTEXT:
        {schema_context}
        
        OPTIMIZATION STRATEGIES:
        - Eliminate redundant scans and Cartesian products.
        - Optimize WHERE clause for SARGability.
        - Recommend CTEs over nested subqueries for clarity.
        - Ensure optimal indexing alignment.
        
        OUTPUT:
        - Provide the ```sql [Optimized Query] ``` first.
        - Follow with a bulleted "Performance Delta" explanation.
        """

    def _get_sql_fix_prompt(self, error: str, schema_context: str) -> str:
        return f"""
        You are a SQL Debugging Specialist. Analyzing a failed query and providing a correction.
        
        DATABASE ERROR:
        {error}
        
        SCHEMA CONTEXT:
        {schema_context}
        
        TASK:
        1. Identify the root cause (syntax, column mismatch, etc.).
        2. Provide the corrected SQL in a markdown block.
        3. Briefly explain the correction.
        """

ai_service = AIService()
