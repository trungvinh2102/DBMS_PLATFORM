"""
agent.py

Autonomous SQL Agent service handling generation, execution, and self-correction.
"""
import json
import logging
from typing import Dict, Any, Optional

from .base import BaseAIService
from .context import schema_context_service
from ..prompts import get_agent_prompt
from ..base_service import BaseDatabaseService
from sqlalchemy import text

logger = logging.getLogger(__name__)

class AgentAIService(BaseAIService):
    """Handles autonomous Text-to-SQL logic with loops and retries."""

    def execute_agent(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None, conv_id: Optional[str] = None) -> Dict[str, Any]:
        """ Autonomous SQL Agent: Generates, Executes, and Self-Corrects SQL. """
        context = schema_context_service.format_schema_context(db_id, schema, intent=prompt)
        system_prompt = get_agent_prompt(context)
        
        # Load conversation history for context awareness
        conv_context = self._context_mgr.build_context_for_agent(conv_id, prompt)
        if conv_context:
            system_prompt += f"\n\n## CONVERSATION HISTORY\n{conv_context}\n\n## CURRENT REQUEST"
        
        current_prompt = f"Natural Request: {prompt}"
        retries = 0
        max_retries = 2
        
        while retries <= max_retries:
            response = self._generate_response(f"{system_prompt}\n\n{current_prompt}", model_id=model_id, user_id=user_id)
            if not response or response.startswith("AI Error:"):
                return {"type": "error", "message": response or "AI Failed"}
            
            try:
                # Clean JSON markdown if present
                clean_raw = self._clean_json_output(response)
                agent_res = json.loads(clean_raw)
                
                if agent_res.get("type") == "error": return agent_res
                
                sql = agent_res.get("sql")
                if not sql:
                    return self._finalize_meta_tool(agent_res, prompt, user_id, db_id, conv_id)
                
                # Try execution
                try:
                    exec_res = self._execute_sql_internal(db_id, sql)
                    agent_res.update(exec_res)
                    
                    self._save_chat("user", prompt, user_id, db_id, conv_id=conv_id)
                    aid = self._save_chat("assistant", json.dumps(agent_res), user_id, db_id, conv_id=conv_id)
                    self._save_generated_query(sql, prompt, agent_res.get("summary"), user_id, db_id)
                    
                    agent_res["messageId"] = aid
                    return agent_res
                    
                except Exception as e:
                    retries += 1
                    if retries > max_retries:
                        return {"type": "error", "message": f"Execution failed after {max_retries} retries: {str(e)}", "last_sql": sql}
                    
                    current_prompt = f"SQL failed with error: {str(e)}\nFAILED SQL: {sql}\nPlease FIX and retry."
                    logger.warning(f"Agent correction triggered (Retry {retries}/{max_retries})")
                    
            except Exception as e:
                logger.error(f"Agent crash: {e}")
                return {"type": "error", "message": f"Internal crash: {str(e)}"}
        
        return {"type": "error", "message": "Max retries exceeded"}

    def _execute_sql_internal(self, db_id: str, sql: str) -> Dict:
        """Helper to run agent query."""
        db_service = BaseDatabaseService()
        def _run(conn):
            query = text(sql).execution_options(max_row_buffer=50)
            res = conn.execute(query)
            cols = list(res.keys())
            data = [dict(zip(cols, row)) for row in res.fetchmany(50)]
            return {"columns": cols, "data": data}
        return db_service.run_dynamic_query(db_id, _run)

    def _finalize_meta_tool(self, agent_res: Dict, prompt: str, user_id: str, db_id: str, conv_id: str) -> Dict:
        """Handles non-SQL responses (thinking, summaries)."""
        agent_res["type"] = "success"
        self._save_chat("user", prompt, user_id, db_id, conv_id=conv_id)
        cid = self._save_chat("assistant", json.dumps(agent_res), user_id, db_id, conv_id=conv_id)
        agent_res["messageId"] = cid
        
        if agent_res.get("confidence", 5) <= 2:
            agent_res["type"] = "clarification"
            agent_res["summary"] = "I'm not sure. Did you mean this? Or can you explain more?"
        return agent_res

    def _clean_json_output(self, text: str) -> str:
        """Strips markdown code blocks."""
        clean = text.strip()
        if clean.startswith("```json"): clean = clean[7:-3].strip()
        elif clean.startswith("```"): clean = clean[3:-3].strip()
        return clean
