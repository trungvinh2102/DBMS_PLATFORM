"""
agent.py

Autonomous SQL Agent service handling generation, execution, and self-correction.
"""
import json
import logging
from typing import Dict, Any, Optional, TypedDict

from .base import BaseAIService
from .context import schema_context_service
from .langchain_runtime import END, START, StateGraph, langchain_runtime
from .sql_safety import sql_safety_validator
from ..prompts import get_agent_prompt
from ..base_service import BaseDatabaseService
from sqlalchemy import text

logger = logging.getLogger(__name__)

class AgentGraphState(TypedDict, total=False):
    """State carried between LangGraph nodes for autonomous SQL execution."""

    prompt: str
    db_id: str
    schema: str
    user_id: Optional[str]
    model_id: Optional[str]
    conv_id: Optional[str]
    system_prompt: str
    retrieval_trace: Dict[str, Any]
    citations: list[Dict[str, Any]]
    current_prompt: str
    raw_response: str
    agent_res: Dict[str, Any]
    error: str
    sql: str
    retries: int
    max_retries: int


class AgentAIService(BaseAIService):
    """Handles autonomous Text-to-SQL logic with loops and retries."""

    def execute_agent(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None, conv_id: Optional[str] = None) -> Dict[str, Any]:
        """Autonomous SQL Agent powered by LangGraph, with legacy loop fallback."""
        if langchain_runtime.is_graph_available:
            try:
                return self._execute_agent_graph(prompt, db_id, schema, user_id, model_id, conv_id)
            except Exception as e:
                logger.warning("LangGraph agent failed; falling back to legacy loop: %s", e)

        return self._execute_agent_legacy(prompt, db_id, schema, user_id, model_id, conv_id)

    def _execute_agent_graph(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None, conv_id: Optional[str] = None) -> Dict[str, Any]:
        """Runs the agent state machine with LangGraph conditional retries."""
        graph = StateGraph(AgentGraphState)
        graph.add_node("prepare", self._agent_prepare_node)
        graph.add_node("generate", self._agent_generate_node)
        graph.add_node("execute", self._agent_execute_node)
        graph.add_node("repair", self._agent_repair_node)
        graph.add_edge(START, "prepare")
        graph.add_edge("prepare", "generate")
        graph.add_conditional_edges(
            "generate",
            self._route_after_generate,
            {"execute": "execute", "done": END},
        )
        graph.add_conditional_edges(
            "execute",
            self._route_after_execute,
            {"repair": "repair", "done": END},
        )
        graph.add_edge("repair", "generate")

        app = graph.compile()
        state = app.invoke({
            "prompt": prompt,
            "db_id": db_id,
            "schema": schema or "public",
            "user_id": user_id,
            "model_id": model_id,
            "conv_id": conv_id,
            "retries": 0,
            "max_retries": 2,
        })

        if state.get("error"):
            return {"type": "error", "message": state["error"], "last_sql": state.get("sql")}

        agent_res = state.get("agent_res") or {}
        if state.get("retrieval_trace"):
            agent_res["retrievalTrace"] = state["retrieval_trace"]
        if state.get("citations"):
            agent_res["citations"] = state["citations"]
        if not agent_res.get("sql"):
            return self._finalize_meta_tool(agent_res, prompt, user_id, db_id, conv_id)

        self._save_chat("user", prompt, user_id, db_id, conv_id=conv_id)
        aid = self._save_chat("assistant", json.dumps(agent_res), user_id, db_id, conv_id=conv_id)
        self._save_retrieval_event(state.get("retrieval_trace"), prompt, db_id, message_id=aid, conv_id=conv_id)
        self._save_generated_query(agent_res.get("sql"), prompt, agent_res.get("summary"), user_id, db_id)
        agent_res["messageId"] = aid
        return agent_res

    def _agent_prepare_node(self, state: AgentGraphState) -> AgentGraphState:
        context_result = schema_context_service.build_schema_context(state["db_id"], state.get("schema") or "public", intent=state["prompt"])
        system_prompt = get_agent_prompt(context_result.context)
        conv_context = self._context_mgr.build_context_for_agent(state.get("conv_id"), state["prompt"])
        if conv_context:
            system_prompt += f"\n\n## CONVERSATION HISTORY\n{conv_context}\n\n## CURRENT REQUEST"

        return {
            **state,
            "system_prompt": system_prompt,
            "retrieval_trace": context_result.retrieval_trace,
            "citations": context_result.citations,
            "current_prompt": f"Natural Request: {state['prompt']}",
        }

    def _agent_generate_node(self, state: AgentGraphState) -> AgentGraphState:
        response = self._generate_response(
            f"{state['system_prompt']}\n\n{state['current_prompt']}",
            model_id=state.get("model_id"),
            user_id=state.get("user_id"),
            task_key="agent.sql_readonly",
            db_id=state.get("db_id"),
        )
        if not response or response.startswith("AI Error:"):
            return {**state, "error": response or "AI Failed"}

        try:
            agent_res = json.loads(self._clean_json_output(response))
        except Exception as e:
            logger.error("Agent JSON parse failed: %s", e)
            return {**state, "error": f"Internal crash: {str(e)}"}

        if agent_res.get("type") == "error":
            return {**state, "error": agent_res.get("message", "AI returned an error")}

        return {
            **state,
            "raw_response": response,
            "agent_res": agent_res,
            "sql": agent_res.get("sql") or "",
        }

    def _agent_execute_node(self, state: AgentGraphState) -> AgentGraphState:
        sql = state.get("sql") or ""
        safety = sql_safety_validator.validate(sql)
        if not safety.isAllowed:
            retries = int(state.get("retries") or 0) + 1
            agent_res = dict(state.get("agent_res") or {})
            agent_res.update({
                "type": "error",
                "message": safety.blockedReason,
                "sql": "",
                "validation": safety.to_dict(),
            })
            return {**state, "agent_res": agent_res, "error": safety.blockedReason, "retries": retries}
        state = {**state, "sql": safety.sanitizedSql}
        try:
            exec_res = self._execute_sql_internal(state["db_id"], safety.sanitizedSql)
            agent_res = dict(state.get("agent_res") or {})
            agent_res.update(exec_res)
            agent_res["sql"] = safety.sanitizedSql
            agent_res["validation"] = safety.to_dict()
            return {**state, "agent_res": agent_res, "error": ""}
        except Exception as e:
            retries = int(state.get("retries") or 0) + 1
            if retries > int(state.get("max_retries") or 2):
                return {
                    **state,
                    "retries": retries,
                    "error": f"Execution failed after {state.get('max_retries', 2)} retries: {str(e)}",
                }
            return {
                **state,
                "retries": retries,
                "error": str(e),
            }

    def _agent_repair_node(self, state: AgentGraphState) -> AgentGraphState:
        logger.warning("LangGraph agent correction triggered (Retry %s/%s)", state.get("retries"), state.get("max_retries"))
        return {
            **state,
            "current_prompt": f"SQL failed validation or execution with error: {state.get('error')}\nFAILED SQL: {state.get('sql')}\nPlease FIX and retry with one safe read-only SQL statement.",
            "error": "",
        }

    def _route_after_generate(self, state: AgentGraphState) -> str:
        if state.get("error") or not state.get("sql"):
            return "done"
        return "execute"

    def _route_after_execute(self, state: AgentGraphState) -> str:
        if state.get("error") and int(state.get("retries") or 0) <= int(state.get("max_retries") or 2):
            return "repair"
        return "done"

    def _execute_agent_legacy(self, prompt: str, db_id: str, schema: str = "public", user_id: Optional[str] = None, model_id: Optional[str] = None, conv_id: Optional[str] = None) -> Dict[str, Any]:
        """Legacy loop used when LangGraph is unavailable or graph execution fails."""
        context_result = schema_context_service.build_schema_context(db_id, schema, intent=prompt)
        system_prompt = get_agent_prompt(context_result.context)
        
        # Load conversation history for context awareness
        conv_context = self._context_mgr.build_context_for_agent(conv_id, prompt)
        if conv_context:
            system_prompt += f"\n\n## CONVERSATION HISTORY\n{conv_context}\n\n## CURRENT REQUEST"
        
        current_prompt = f"Natural Request: {prompt}"
        retries = 0
        max_retries = 2
        
        while retries <= max_retries:
            response = self._generate_response(
                f"{system_prompt}\n\n{current_prompt}",
                model_id=model_id,
                user_id=user_id,
                task_key="agent.sql_readonly",
                db_id=db_id,
            )
            if not response or response.startswith("AI Error:"):
                return {"type": "error", "message": response or "AI Failed"}
            
            try:
                # Clean JSON markdown if present
                clean_raw = self._clean_json_output(response)
                agent_res = json.loads(clean_raw)
                
                if agent_res.get("type") == "error": return agent_res
                
                sql = agent_res.get("sql")
                if not sql:
                    agent_res["retrievalTrace"] = context_result.retrieval_trace
                    agent_res["citations"] = context_result.citations
                    return self._finalize_meta_tool(agent_res, prompt, user_id, db_id, conv_id)
                safety = sql_safety_validator.validate(sql)
                if not safety.isAllowed:
                    agent_res.update({
                        "type": "error",
                        "message": safety.blockedReason,
                        "sql": "",
                        "validation": safety.to_dict(),
                    })
                    return agent_res
                sql = safety.sanitizedSql
                agent_res["sql"] = sql
                agent_res["validation"] = safety.to_dict()
                
                # Try execution
                try:
                    exec_res = self._execute_sql_internal(db_id, sql)
                    agent_res.update(exec_res)
                    
                    self._save_chat("user", prompt, user_id, db_id, conv_id=conv_id)
                    aid = self._save_chat("assistant", json.dumps(agent_res), user_id, db_id, conv_id=conv_id)
                    self._save_retrieval_event(context_result.retrieval_trace, prompt, db_id, message_id=aid, conv_id=conv_id)
                    self._save_generated_query(sql, prompt, agent_res.get("summary"), user_id, db_id)
                    
                    agent_res["messageId"] = aid
                    agent_res["retrievalTrace"] = context_result.retrieval_trace
                    agent_res["citations"] = context_result.citations
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
        self._save_retrieval_event(agent_res.get("retrievalTrace"), prompt, db_id, message_id=cid, conv_id=conv_id)
        agent_res["messageId"] = cid
        
        if agent_res.get("confidence", 5) <= 2:
            agent_res["type"] = "clarification"
            agent_res["summary"] = "Tôi chưa chắc ý của bạn. Bạn có thể nói rõ hơn không?"
        return agent_res

    def _clean_json_output(self, text: str) -> str:
        """Strips markdown code blocks."""
        clean = text.strip()
        if clean.startswith("```json"): clean = clean[7:-3].strip()
        elif clean.startswith("```"): clean = clean[3:-3].strip()
        return clean
