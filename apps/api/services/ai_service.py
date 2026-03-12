"""
backend/services/ai_service.py
AI service using Google Gemini.
"""
import os
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False
from services.metadata import metadata_service
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")  # Ensure this is set in .env
        if HAS_GENAI and api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.model = None
            if not HAS_GENAI:
                logger.warning("google-generativeai package not installed. AI features disabled.")
            else:
                logger.warning("GOOGLE_API_KEY not set. AI features disabled.")

    def _extract_sql(self, text):
        import re
        match = re.search(r"```sql\n([\s\S]*?)\n```", text)
        if match: return match.group(1).strip()
        match = re.search(r"```\n([\s\S]*?)\n```", text)
        if match: return match.group(1).strip()
        return text.strip()

    def _format_schema_context(self, db_id, schema):
        # Use the newly added get_all_columns for better efficiency
        all_cols = metadata_service.get_all_columns(db_id, schema)
        if not all_cols:
            return "No schema metadata available."
            
        context = []
        # Limit to reasonable number of tables for context
        for t, cols in list(all_cols.items())[:30]:
            col_strs = [f"{c['name']} ({c['type']})" for c in cols]
            context.append(f'Table "{t}" {{\n  ' + ",\n  ".join(col_strs) + '\n}')
            
        return "\n\n".join(context)

    def generate_sql(self, prompt, db_id, schema="public"):
        if not self.model: return {"error": "AI not configured"}
        
        schema_context = self._format_schema_context(db_id, schema)
        
        system_prompt = f"""
        You are an Elite AI SQL Architect (2026 Edition). Your goal is to synthesize high-performance, precision SQL queries.
        
        DATABASE KNOWLEDGE GRAPH:
        {schema_context}
        
        DIRECTIVES:
        - Output ONLY the optimized SQL query within a ```sql ... ``` block.
        - Ensure 100% compliance with requested business logic.
        - Use modern SQL features (CTEs, Window Functions) for better readability and performance where appropriate.
        - Strictly enforce data security; only SELECT operations are permitted.
        - If the request is ambiguous, provide the most technically sound interpretation.
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nUser Intent: {prompt}")
        return {"sql": self._extract_sql(response.text)}

    def explain_sql(self, sql):
        if not self.model: return {"error": "AI not configured"}
        
        system_prompt = """
        You are a Database Logic Translator. Deconstruct the provided SQL query into a clear, high-level narrative for architects and developers.
        
        STRUCTURE:
        1. Purpose: What does this query achieve?
        2. Mechanisms: Break down JOINs, filters, and aggregations.
        3. Data Flow: Describe the transformation path from source to result.
        
        Use concise, premium professional language.
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nSQL EXECUTABLE:\n{sql}")
        return {"explanation": response.text}

    def optimize_sql(self, sql, db_id, schema="public"):
        if not self.model: return {"error": "AI not configured"}
        
        schema_context = self._format_schema_context(db_id, schema)
        
        system_prompt = f"""
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
        
        response = self.model.generate_content(f"{system_prompt}\n\nCURRENT SQL:\n{sql}")
        return {"result": response.text, "sql": self._extract_sql(response.text)}

    def fix_sql(self, sql, error, db_id, schema="public"):
        if not self.model: return {"error": "AI not configured"}
        
        schema_context = self._format_schema_context(db_id, schema)
        
        system_prompt = f"""
        You are a SQL Debugging Specialist. The user's query has failed with a database error.
        Analyze the error and the schema context to provide a working correction.
        
        DATABASE ERROR:
        {error}
        
        SCHEMA CONTEXT:
        {schema_context}
        
        TASK:
        1. Identify the root cause (syntax, column mismatch, permission, etc.).
        2. Provide the corrected SQL in a markdown block.
        3. Briefly explain the correction.
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nFAILED SQL:\n{sql}")
        return {"result": response.text, "sql": self._extract_sql(response.text)}

ai_service = AIService()
