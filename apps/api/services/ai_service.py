"""
ai_service.py

Service using Google Gemini for SQL generation, explanation, and optimization.
Supports both global and user-specific API keys.
"""

import os
import re
import uuid
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from services.metadata import metadata_service
from services.base_service import BaseDatabaseService
from models.metadata import AIChatMessage, AIGeneratedQuery, UserAIConfig, SessionLocal 
from .prompts import (
    get_sql_generation_prompt,
    get_sql_explanation_prompt,
    get_sql_optimization_prompt,
    get_sql_fix_prompt,
    get_agent_prompt
)
from .conversation_context import ConversationContextManager

logger = logging.getLogger(__name__)

class AIService:
    """
    Integrates with Google Generative AI to provide SQL-related intelligence.
    Supports SQL generation, explanation, optimization, and error fixing.
    """

    def __init__(self):
        self._schema_cache = {} # Cache for schema context: {db_id: {timestamp, context}}
        self._cache_ttl = timedelta(minutes=10) # 10 minute cache for schema
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

        # Initialize conversation context manager with model reference for summarization
        self._context_mgr = ConversationContextManager(ai_model=self.model)

    def generate_sql(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Generates a SQL query based on natural language intent and schema context."""
        self._save_chat("user", prompt, user_id, db_id)

        context = self._format_schema_context(db_id, schema)
        system_prompt = get_sql_generation_prompt(context)
        
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
        system_prompt = get_sql_explanation_prompt()
        
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
        system_prompt = get_sql_optimization_prompt(context)
        
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
        system_prompt = get_sql_fix_prompt(error, context)
        
        response_text = self._generate_response(f"{system_prompt}\n\nFAILED SQL:\n{sql}", model_id=model_id, user_id=user_id)
        if not response_text or response_text.startswith("AI Error:"):
            error_msg = response_text if response_text else "AI response was empty or failed"
            self._save_chat("assistant", error_msg, user_id, db_id)
            return {"error": error_msg}
            
        fixed_sql = self._extract_sql(str(response_text))
        self._save_chat("assistant", str(response_text), user_id, db_id)
        self._save_generated_query(fixed_sql, f"Fix Error: {error}", str(response_text), user_id, db_id)

        return {"result": str(response_text), "sql": fixed_sql}

    def autocomplete_sql(self, db_id: str, schema: str, prefix: str, suffix: str, user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides fast inline SQL autocomplete using Gemini."""
        context = self._format_schema_context(db_id, schema)
        
        system_instruction = (
            "You are a fast, precise SQL coding assistant for inline autocomplete.\n"
            f"Here is the database schema context:\n{context}\n\n"
            "INSTRUCTIONS:\n"
            "1. You are given a SQL `prefix` (before cursor) and `suffix` (after cursor).\n"
            "2. Predict ONLY the missing text that connects `prefix` and `suffix`.\n"
            "3. DO NOT repeat the prefix or suffix. DO NOT output markdown blocks unless avoiding it is impossible.\n"
            "4. Only use valid table and column names from the schema provided.\n"
            "5. If no confident completion exists, return empty text."
        )
        
        prompt = f"PREFIX:\n{prefix}\n\nSUFFIX:\n{suffix}\n\nCOMPLETION:"
        
        target_model = model_id or "gemini-1.5-flash"
        
        try:
            model = genai.GenerativeModel(
                model_name=target_model,
                system_instruction=system_instruction,
                generation_config={"temperature": 0.1, "max_output_tokens": 128}
            )
            response = model.generate_content(prompt)
            completion = response.text.strip() if response and response.text else ""
            
            # Remove any markdown code block wrappers
            if completion.startswith("```"):
                completion = completion.replace("```sql\n", "").replace("```sql", "").replace("```\n", "").replace("```", "").strip()
                
            return {"completion": completion}
        except Exception as e:
            logger.error(f"Autocomplete API failed: {e}", exc_info=True)
            return {"completion": "", "error": str(e)}

    def execute_agent(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None, conv_id: Optional[str] = None) -> Dict[str, Any]:
        """ Autonomous SQL Agent: Generates, Executes, and Self-Corrects SQL. """
        context = self._format_schema_context(db_id, schema)
        system_prompt = get_agent_prompt(context)
        
        # Load conversation history for multi-turn context awareness
        conv_context = self._context_mgr.build_context_for_agent(conv_id, prompt)
        if conv_context:
            system_prompt += f"\n\n## CONVERSATION HISTORY\n{conv_context}\n\n## CURRENT REQUEST"
        
        current_prompt = f"Natural Language Request: {prompt}"
        retries = 0
        max_retries = 2
        
        while retries <= max_retries:
            response_text = self._generate_response(f"{system_prompt}\n\n{current_prompt}", model_id=model_id, user_id=user_id)
            
            if not response_text or response_text.startswith("AI Error:"):
                return {"type": "error", "message": response_text or "AI Failed to respond"}
            
            try:
                # Clean possible markdown wrap if AI ignored "STRICT JSON ONLY"
                clean_json = response_text.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:-3].strip()
                elif clean_json.startswith("```"):
                    clean_json = clean_json[3:-3].strip()
                
                agent_response = json.loads(clean_json)
                
                if agent_response.get("type") == "error":
                    return agent_response
                
                # For meta-tasks (explanation, analysis), SQL might be empty.
                # Only try to execute if SQL is provided.
                sql = agent_response.get("sql")
                if not sql:
                    # If it's a valid text response with a summary, return it as success
                    if agent_response.get("summary") or agent_response.get("thinking"):
                        agent_response["type"] = "success"
                        return agent_response
                    return {"type": "error", "message": "No SQL generated by Agent"}
                
                # Execute SQL
                try:
                    db_service = BaseDatabaseService()
                    
                    def run_query(conn):
                        from sqlalchemy import text
                        # Limit rows as per Agent rules
                        query = text(sql).execution_options(max_row_buffer=50)
                        result = conn.execute(query)
                        
                        cols = list(result.keys())
                        data = []
                        for row in result:
                            if len(data) >= 50: break
                            data.append(dict(zip(cols, row)))
                        return {"columns": cols, "data": data}

                    exec_res = db_service.run_dynamic_query(db_id, run_query)
                    
                    # Log successful execution to Agent flow
                    agent_response["columns"] = exec_res["columns"]
                    agent_response["data"] = exec_res["data"]
                    
                    self._save_chat("user", prompt, user_id, db_id, conv_id=conv_id)
                    self._save_chat("assistant", f"Agent SQL: {sql}\n\nSummary: {agent_response.get('summary')}", user_id, db_id, conv_id=conv_id)
                    self._save_generated_query(sql, prompt, agent_response.get("summary"), user_id, db_id)
                    
                    return agent_response
                    
                except Exception as e:
                    retries += 1
                    if retries > max_retries:
                        return {
                            "type": "error",
                            "message": f"Execution failed after {max_retries} retries: {str(e)}",
                            "last_sql": sql
                        }
                    
                    # Feed error back for self-correction
                    current_prompt = f"The previous SQL failed with error: {str(e)}\nFAILED SQL: {sql}\nPlease FIX and retry."
                    logger.warning(f"Agent self-correction triggered (Retry {retries}/{max_retries}) for error: {e}")
                    
            except json.JSONDecodeError:
                return {"type": "error", "message": "Failed to parse Agent JSON response", "raw": response_text}
            except Exception as e:
                return {"type": "error", "message": f"Agent internal error: {str(e)}"}
        
        return {"type": "error", "message": "Max retries exceeded"}

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

    def stream_generate_response(self, prompt: str, db_id: Optional[str] = None, schema: str = "public", model_id: Optional[str] = None, user_id: Optional[str] = None, history: Optional[list] = None, conv_id: Optional[str] = None):
        """Streams responses from Gemini, incorporating schema context and past conversation history."""
        if not HAS_GENAI:
            yield "AI Error: google-generativeai package is not installed"
            return
            
        system_prompt = "You are the Supreme SQL Architect."
        if db_id:
            context = self._format_schema_context(db_id, schema)
            system_prompt = get_sql_generation_prompt(context)

        # Build messages using ConversationContextManager if conv_id is available
        if conv_id:
            messages = self._context_mgr.build_context(conv_id, prompt)
        elif history:
            # Legacy path: manual history from request body
            messages = []
            for msg in history:
                role = "model" if msg['role'] == "assistant" else "user"
                messages.append({'role': role, 'parts': [{'text': msg['content']}]})
            messages.append({'role': 'user', 'parts': [{'text': prompt}]})
        else:
            messages = [{'role': 'user', 'parts': [{'text': prompt}]}]

        target_model = model_id or self.model_name
        try:
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
        # Check cache
        cache_key = f"{db_id}:{schema}"
        if cache_key in self._schema_cache:
            entry = self._schema_cache[cache_key]
            if datetime.now() - entry["timestamp"] < self._cache_ttl:
                return entry["context"]

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
            
        context_str = "\n\n".join(context)
        # Update cache
        self._schema_cache[cache_key] = {
            "timestamp": datetime.now(),
            "context": context_str
        }
        return context_str


ai_service = AIService()
