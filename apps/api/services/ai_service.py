"""
ai_service.py

Specialized AI service delegator that coordinates multiple AI strategies
(SQL tasks, Agents, Semantic Context) for QurioDB.
"""
import logging
import json
import google.generativeai as genai
from typing import Dict, Any, Optional

from .ai.sql import SqlAIService
from .ai.agent import AgentAIService
from .ai.context import schema_context_service

logger = logging.getLogger(__name__)

class AIService(SqlAIService, AgentAIService):
    """
    Primary AI service delegator.
    Inherits from specialized services and uses common schema_context utilities.
    """

    def __init__(self):
        super().__init__()
        # Additional startup logic if needed
        logger.info("AIService initialized with multi-strategy delegation.")

    # --- Schema Context methods (Delegated to schema_context_service) ---
    
    def _format_schema_context(self, db_id: str, schema: str, intent: Optional[str] = None) -> str:
        """Proxies schema context formatting to the specialized context service."""
        return schema_context_service.format_schema_context(db_id, schema, intent=intent)

    # --- Autocomplete Task ---

    def autocomplete_sql(self, db_id: str, schema: str, prefix: str, suffix: str, user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides fast inline SQL autocomplete using Gemini."""
        context = self._format_schema_context(db_id, schema, intent=f"{prefix} ... {suffix}")
        
        system_instruction = (
            "You are a fast, precise SQL coding assistant for inline autocomplete.\n"
            f"Here is the database schema context:\n{context}\n\n"
            "INSTRUCTIONS:\n"
            "1. Predict ONLY the missing text connecting prefix and suffix.\n"
            "2. DO NOT repeat prefix/suffix. DO NOT output markdown.\n"
            "3. If no confident completion, return empty."
        )
        
        prompt = f"PREFIX:\n{prefix}\n\nSUFFIX:\n{suffix}\n\nCOMPLETION:"
        try:
            model = genai.GenerativeModel(
                model_name=model_id or "gemini-2.5-flash",
                system_instruction=system_instruction,
                generation_config={"temperature": 0.1, "max_output_tokens": 128}
            )
            response = model.generate_content(prompt)
            completion = self._clean_sql_code(response.text) if response and response.text else ""
            return {"completion": completion}
        except Exception as e:
            logger.error(f"Autocomplete failed: {e}")
            return {"completion": "", "error": str(e)}

    def _clean_sql_code(self, completion: str) -> str:
        """Helper to clean autocomplete text."""
        completion = completion.strip()
        if completion.startswith("```"):
            completion = completion.replace("```sql\n", "").replace("```sql", "").replace("```\n", "").replace("```", "").strip()
        return completion

    # --- Streaming Logic ---

    def stream_generate_response(self, prompt: str, db_id: Optional[str] = None, schema: str = "public", model_id: Optional[str] = None, user_id: Optional[str] = None, history: Optional[list] = None, conv_id: Optional[str] = None):
        """Streams responses for chat interfaces using SSE events."""
        system_prompt = "You are the Supreme SQL Architect."
        if db_id:
            context = self._format_schema_context(db_id, schema, intent=prompt)
            from .prompts import get_sql_generation_prompt
            system_prompt = get_sql_generation_prompt(context)

        messages = self._context_mgr.build_context(conv_id, prompt) if conv_id else [{'role': 'user', 'parts': [{'text': prompt}]}]
        
        try:
            model = genai.GenerativeModel(model_name=model_id or "gemini-2.0-flash", system_instruction=system_prompt)
            
            # State tracker for event types
            current_event = "thinking"
            
            for chunk in model.generate_content(messages, stream=True):
                if not chunk.candidates:
                    continue
                
                for part in chunk.candidates[0].content.parts:
                    # 1. Handle native thinking (for models like Gemini 2.0 Flash Thinking)
                    if hasattr(part, 'thought') and part.thought:
                        yield "thinking", part.thought
                        continue

                    # 2. Handle native function/tool calls
                    if part.function_call:
                        args = {k: v for k, v in part.function_call.args.items()}
                        yield "tool_call", json.dumps({
                            "name": part.function_call.name,
                            "args": args
                        })
                        continue

                    # 3. Handle standard text chunks
                    if part.text:
                        text = part.text
                        
                        # Simple state machine to switch events based on markers
                        if "<thinking>" in text:
                            current_event = "thinking"
                        elif "<confidence>" in text:
                            current_event = "confidence"
                        elif "```sql" in text:
                            current_event = "sql"
                        elif "### ANALYSIS" in text:
                            current_event = "analysis"
                        
                        yield current_event, text

        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            yield "error", str(e)

# Singleton Instance
ai_service = AIService()
