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
        # We need columns. metadata_service.get_columns needs table name.
        # So first get tables, then get columns for each? expensive.
        # Or better: get all columns logic.
        # But existing metadata_service only has get_columns for specific table.
        # We should iterate tables.
        
        tables = metadata_service.get_tables(db_id, schema)
        context = []
        
        # Limit to first 10-20 tables to avoid token limit if DB is huge? 
        # For now assume reasonable size or just fetch all.
        for t in tables[:20]: 
            cols = metadata_service.get_columns(db_id, schema, t)
            col_strs = [f"{c['name']} ({c['type']})" for c in cols]
            context.append(f'Table "{t}" {{\n  ' + ",\n  ".join(col_strs) + '\n}')
            
        return "\n\n".join(context)

    def generate_sql(self, prompt, db_id, schema="public"):
        if not self.model: return {"error": "AI not configured"}
        
        schema_context = self._format_schema_context(db_id, schema)
        
        system_prompt = f"""
        You are an expert SQL developer. Your task is to generate valid SQL queries based on user requests and the provided database schema.
        
        DATABASE SCHEMA:
        {schema_context}
        
        RULES:
        1. ONLY output the SQL query inside a markdown code block.
        2. Do NOT provide any explanation unless specifically asked.
        3. Use the provided schema context (tables and columns) strictly.
        4. ONLY generate SELECT queries for data retrieval. Prohibit any destructive operations (INSERT, UPDATE, DELETE, DROP, etc.).
        5. Use standard SQL syntax compatible with the database.
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nUser Request: {prompt}")
        return {"sql": self._extract_sql(response.text)}

    def explain_sql(self, sql):
        if not self.model: return {"error": "AI not configured"}
        
        system_prompt = """
        You are a technical educator. Explain the following SQL query in plain, easy-to-understand English. 
        Break it down step-by-step (e.g., what tables are used, what filters are applied, and what the final output represents).
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nSQL:\n{sql}")
        return {"explanation": response.text}

    def optimize_sql(self, sql, db_id, schema="public"):
        if not self.model: return {"error": "AI not configured"}
        
        schema_context = self._format_schema_context(db_id, schema)
        
        system_prompt = f"""
        You are a Database Performance Engineer. Analyze the provided SQL query and suggest optimizations.
        Focus on:
        - Better use of indexes.
        - Avoiding "SELECT *".
        - Improving JOIN efficiency.
        - Better WHERE clause predicates.
        
        SCHEMA CONTEXT:
        {schema_context}
        
        OUTPUT FORMAT:
        1. Optimized SQL (in a code block).
        2. Brief explanation of changes.
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nSQL:\n{sql}")
        return {"result": response.text}

ai_service = AIService()
