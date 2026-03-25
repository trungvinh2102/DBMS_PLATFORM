"""
ai_service.py

Service using Google Gemini for SQL generation, explanation, and optimization.
Supports both global and user-specific API keys.
"""

import os
import re
import uuid
import logging
from typing import Dict, Any, Optional

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from services.metadata import metadata_service
from services.base_service import BaseDatabaseService
from models.metadata import AIChatMessage, AIGeneratedQuery, UserAIConfig, SessionLocal

logger = logging.getLogger(__name__)

class AIService:
    """
    Integrates with Google Generative AI to provide SQL-related intelligence.
    Supports SQL generation, explanation, optimization, and error fixing.
    """

    def __init__(self):
        """Initializes the Gemini model with the GOOGLE_API_KEY environment variable."""
        api_key = os.getenv("GOOGLE_API_KEY")
        self.model_name = 'gemini-2.5-flash' # Default model
        self.model: Optional[Any] = None

        if HAS_GENAI and api_key:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel(self.model_name)
                logger.info(f"AIService initialized with global model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to configure global Gemini: {e}")

    def generate_sql(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Generates a SQL query based on natural language intent and schema context."""
        self._save_chat("user", prompt, user_id, db_id)

        context = self._format_schema_context(db_id, schema)
        system_prompt = self._get_sql_generation_prompt(context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nUser Intent: {prompt}", model_id=model_id, user_id=user_id)
        if not response_text or response_text.startswith("AI Error:"):
            error_msg = response_text if response_text else "AI response was empty or failed"
            self._save_chat("assistant", error_msg, user_id, db_id)
            return {"error": error_msg}
            
        sql = self._extract_sql(str(response_text))
        self._save_chat("assistant", str(response_text), user_id, db_id)
        self._save_generated_query(sql, prompt, "AI Generated Query", user_id, db_id)
        
        return {"sql": sql}

    def explain_sql(self, sql: str, user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides a natural language explanation of the logic within a SQL query."""
        self._save_chat("user", f"Explain this SQL: {sql}", user_id)
        system_prompt = self._get_sql_explanation_prompt()
        
        response_text = self._generate_response(f"{system_prompt}\n\nSQL EXECUTABLE:\n{sql}", model_id=model_id, user_id=user_id)
        if not response_text or response_text.startswith("AI Error:"):
            error_msg = response_text if response_text else "AI response was empty or failed"
            self._save_chat("assistant", error_msg, user_id)
            return {"error": error_msg}
            
        self._save_chat("assistant", str(response_text), user_id)
        return {"explanation": response_text}

    def optimize_sql(self, sql: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Refactors SQL for better performance based on schema context."""
        self._save_chat("user", f"Optimize this SQL: {sql}", user_id, db_id)
        context = self._format_schema_context(db_id, schema)
        system_prompt = self._get_sql_optimization_prompt(context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nCURRENT SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response_text or response_text.startswith("AI Error:"):
            error_msg = response_text if response_text else "AI response was empty or failed"
            self._save_chat("assistant", error_msg, user_id, db_id)
            return {"error": error_msg}
            
        optimized_sql = self._extract_sql(str(response_text))
        self._save_chat("assistant", str(response_text), user_id, db_id)
        self._save_generated_query(optimized_sql, f"Optimize: {sql}", str(response_text), user_id, db_id)

        return {"result": str(response_text), "sql": optimized_sql}

    def fix_sql(self, sql: str, error: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Analyzes a SQL error and provides a corrected version of the query."""
        self._save_chat("user", f"Fix this SQL error: {error}\nSQL: {sql}", user_id, db_id)
        context = self._format_schema_context(db_id, schema)
        system_prompt = self._get_sql_fix_prompt(error, context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nFAILED SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response_text or response_text.startswith("AI Error:"):
            error_msg = response_text if response_text else "AI response was empty or failed"
            self._save_chat("assistant", error_msg, user_id, db_id)
            return {"error": error_msg}
            
        fixed_sql = self._extract_sql(str(response_text))
        self._save_chat("assistant", str(response_text), user_id, db_id)
        self._save_generated_query(fixed_sql, f"Fix Error: {error}", str(response_text), user_id, db_id)

        return {"result": str(response_text), "sql": fixed_sql}

    # --- Private Helper Methods ---

    def _generate_response(self, combined_prompt: str, model_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """Internal helper to communicate with the Gemini API, using user-specific keys if available."""
        if not HAS_GENAI:
            return "AI Error: google-generativeai package is not installed"
            
        # Try to use user-specific API Key
        if user_id:
            try:
                from routes.ai_config import decrypt_key
                session = SessionLocal()
                config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
                if config and config.apiKey:
                    key = decrypt_key(config.apiKey)
                    if key:
                        genai.configure(api_key=key)
                session.close()
            except Exception as e:
                logger.error(f"Failed to use user AI key: {e}")

        target_model = model_id or self.model_name
        try:
            model = genai.GenerativeModel(target_model)
            response = model.generate_content(combined_prompt)
            return response.text if response and response.text else ""
        except Exception as e:
            # Fallback to global config if user config failed (or if no user config)
            if user_id:
                api_key = os.getenv("GOOGLE_API_KEY")
                if api_key:
                    try:
                        genai.configure(api_key=api_key)
                        model = genai.GenerativeModel(target_model)
                        response = model.generate_content(combined_prompt)
                        return response.text if response and response.text else ""
                    except:
                        pass
            
            logger.error(f"Gemini API call failed with model {target_model}: {e}", exc_info=True)
            return f"AI Error: {str(e)}"

    def stream_generate_response(self, prompt: str, db_id: Optional[str] = None, schema: str = "public", model_id: Optional[str] = None, user_id: Optional[str] = None, history: Optional[list] = None):
        """Streams responses from Gemini, incorporating schema context and past conversation history."""
        if not HAS_GENAI:
            yield "AI Error: google-generativeai package is not installed"
            return
            
        system_prompt = "You are the Supreme SQL Architect."
        if db_id:
            context = self._format_schema_context(db_id, schema)
            system_prompt = self._get_sql_generation_prompt(context)

        # Prepare messages for Gemini
        messages = []
        if history:
            for msg in history:
                # Map 'assistant' to 'model' for Gemini
                role = "model" if msg['role'] == "assistant" else "user"
                messages.append({'role': role, 'parts': [msg['content']]})
        
        # Add the current prompt
        messages.append({'role': 'user', 'parts': [prompt]})

        target_model = model_id or self.model_name
        try:
            # Construct model with system instructions if supported by the SDK version
            # Fallback to appending system prompt to the first message if needed
            model = genai.GenerativeModel(
                model_name=target_model,
                system_instruction=system_prompt
            )
            
            response = model.generate_content(messages, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini Streaming API call failed with model {target_model}: {e}", exc_info=True)
            yield f"AI Error: {str(e)}"

    def _save_chat(self, role: str, content: str, user_id: Optional[str] = None, db_id: Optional[str] = None, conv_id: Optional[str] = None):
        """Persists AI chat messages to the database."""
        session = SessionLocal()
        try:
            msg = AIChatMessage(
                id=str(uuid.uuid4()),
                role=role,
                content=str(content)[:5000], 
                userId=user_id,
                databaseId=db_id,
                conversationId=conv_id
            )
            session.add(msg)
            session.commit()
        except Exception as e:
            logger.error(f"Failed to save AI chat message: {e}")
            session.rollback()
        finally:
            session.close()

    def _save_generated_query(self, sql: str, prompt: Optional[str], explanation: Optional[str], user_id: Optional[str] = None, db_id: Optional[str] = None):
        """Persists AI generated SQL queries to the database."""
        session = SessionLocal()
        try:
            query = AIGeneratedQuery(
                id=str(uuid.uuid4()),
                prompt=str(prompt)[:2000] if prompt else None,
                sql=str(sql),
                explanation=str(explanation)[:5000] if explanation else None,
                userId=user_id,
                databaseId=db_id
            )
            session.add(query)
            session.commit()
        except Exception as e:
            logger.error(f"Failed to save AI generated query: {e}")
            session.rollback()
        finally:
            session.close()

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
        """Constructs a rich, dialect-aware schema context for the AI."""
        # Get dialect info
        db_type = "SQL"
        session = SessionLocal()
        try:
            base_service = BaseDatabaseService()
            db_type, _ = base_service.get_db_config(db_id, session)
        except Exception: 
            pass
        finally: 
            session.close()

        all_cols = metadata_service.get_all_columns(db_id, schema)
        if not all_cols:
            return f"DATABASE TYPE: {db_type}\nNo schema metadata available."
            
        # Get Foreign Keys for relationship mapping
        all_fks = metadata_service.get_all_foreign_keys(db_id, schema)
        fks_by_table = {}
        for fk in all_fks:
            t = fk['table']
            if t not in fks_by_table: fks_by_table[t] = []
            fks_by_table[t].append(f"FOREIGN KEY ({fk['column']}) REFERENCES {fk['foreignTable']}({fk['foreignColumn']})")

        context = [f"DATABASE DIALECT: {db_type.upper()}", "SCHEMA STRUCTURE:"]
        count = 0
        for t, cols in all_cols.items():
            if count >= 60: break # Increased limit
            col_strs = [f"{c['name']} {c['type']}" + (" NOT NULL" if not c.get('nullable') else "") for c in cols]
            table_def = [f'CREATE TABLE "{t}" (']
            table_def.extend([f"  {s}" for s in col_strs])
            
            # Add FKs if any
            if t in fks_by_table:
                table_def.extend([f"  {fk}" for fk in fks_by_table[t]])
            
            table_def.append(");")
            context.append("\n".join(table_def))
            count += 1
            
        return "\n\n".join(context)

    # --- Prompt Templates ---
    def _get_sql_generation_prompt(self, schema_context: str) -> str:
        return f"""You are the 'Supreme SQL Architect' - an AI expert in SQL engineering, database performance, and data modeling.
Your goal is to translate natural language into high-performance, secure, and idiomatic SQL.

### DATABASE ENVIRONMENT:
{schema_context}

### CORE INSTRUCTIONS:
1. **Dialect Awareness**: Strictly follow the syntax rules of the detected DATABASE DIALECT.
2. **Readability**: Use Common Table Expressions (CTEs) for multi-step logic. Prefer explicit JOIN syntax.
3. **Performance**: Avoid `SELECT *`. Select only required columns. Use indexes effectively in WHERE clauses.
4. **Safety**: Never generate destructive queries (DROP, DELETE without WHERE, etc.).
5. **Language**: If the user asks in VIETNAMESE, you MUST respond in VIETNAMESE for all text (Thinking/Analysis), but keep SQL as standard code.

### RESPONSE STRUCTURE:
1. **<thinking>**: Start by analyzing the intent, identifying entities, planning the JOIN paths, and considering edge cases (nulls, duplicates).
2. **<confidence>**: Provide a score from 1 to 5 (1=Unsure, 5=Absolute Certainty) based on your understanding of the schema and the complexity of the request.
3. **SQL Block**: Provide exactly one clean markdown block using ```sql.
4. **### ANALYSIS**: Provide a detailed breakdown including:
    - **Logic**: How the data is filtered and aggregated.
    - **Performance**: Why this query is efficient.
    - **Note**: Any assumptions made.

### FORMAT:
<thinking>
[Step-by-step strategy]
</thinking>

<confidence>[Score 1-5]</confidence>

```sql
[SQL Query]
```

### ANALYSIS:
[Your detailed breakdown]
"""

    def _get_sql_explanation_prompt(self) -> str:
        return """You are the 'Supreme SQL Architect'. Provide a crystal-clear, deep explanation of the provided SQL.

### INSTRUCTIONS:
1. **Persona**: Senior Database Architect & Mentor.
2. **Analysis**: Explain *why* certain keywords/clauses are used, not just *what* they do.
3. **Logic Path**: Trace the data flow from source tables to the final result set.
4. **Language**: If the user asks in VIETNAMESE, respond fully in VIETNAMESE for all text.

### FORMAT:
<thinking>
[Brief reasoning on query complexity]
</thinking>

```sql
[The SQL being explained]
```

### ANALYSIS:
[Your line-by-line, deep breakdown]
"""

    def _get_sql_optimization_prompt(self, schema_context: str) -> str:
        return f"""You are the 'Supreme SQL Architect' - an expert in high-performance database tuning.
Your mission is to refactor the provided SQL to minimize execution time and resource consumption.

### DATABASE ENVIRONMENT:
{schema_context}

### OPTIMIZATION STRATEGIES:
1. **Simplify**: Remove redundant joins and subqueries. Use CTEs if they help the optimizer.
2. **Index Alignment**: Ensure WHERE clauses align with the primary/foreign keys provided.
3. **Data Volume**: Add LIMIT where appropriate and avoid expensive sorting if not needed.
4. **Dialect Specifics**: Use performance-heavy primitives specific to the DATABASE DIALECT.

### FORMAT:
<thinking>
[Analysis of bottlenecks and proposed refactoring strategy]
</thinking>

```sql
[Optimized SQL]
```

### ANALYSIS:
[Detailed comparison of improvements and performance impact]
"""

    def _get_sql_fix_prompt(self, error: str, schema_context: str) -> str:
        return f"""You are the 'Supreme SQL Architect' - a master debugger.
Fix the broken SQL query based on the provided error message and schema context.

### ERROR MESSAGE:
{error}

### DATABASE ENVIRONMENT:
{schema_context}

### DEBUGGING PROTOCOL:
1. **Root Cause**: Identify if it's a syntax error, a missing column, or an invalid join.
2. **Schema Alignment**: Verify all identifiers against the SCHEMA STRUCTURE.
3. **Fix Strategy**: Apply the minimal necessary changes to make the query valid and performant.

### FORMAT:
<thinking>
[Detailed debugging trace and fix plan]
</thinking>

```sql
[Corrected SQL]
```

### ANALYSIS:
[Explanation of why the error occurred and how it was fixed]
"""

ai_service = AIService()
