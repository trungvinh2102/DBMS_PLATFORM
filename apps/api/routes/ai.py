"""
backend/routes/ai.py
"""
import os
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from services.ai_service import ai_service
from models.metadata import AIChatMessage, AIConversation, AIFeedback, AIModel, SessionLocal
from utils.auth_middleware import get_current_user

ai_bp = APIRouter()

class AddModelRequest(BaseModel):
    name: str
    modelId: str
    provider: str = 'Google'
    description: Optional[str] = None

class GenerateSqlRequest(BaseModel):
    prompt: str
    databaseId: str
    schema_name: Optional[str] = None
    modelId: Optional[str] = None

class ExplainSqlRequest(BaseModel):
    sql: str
    modelId: Optional[str] = None

class OptimizeSqlRequest(BaseModel):
    sql: str
    databaseId: str
    schema_name: Optional[str] = None
    modelId: Optional[str] = None

class FixSqlRequest(BaseModel):
    sql: str
    error: str
    databaseId: str
    schema_name: Optional[str] = None
    modelId: Optional[str] = None

class CompleteSqlRequest(BaseModel):
    databaseId: str
    schema_name: Optional[str] = None
    prefix: str = ''
    suffix: str = ''
    modelId: Optional[str] = None

class ExecuteAgentRequest(BaseModel):
    prompt: str
    databaseId: str
    schema_name: Optional[str] = None
    conversationId: Optional[str] = None
    modelId: Optional[str] = None

class StreamChatRequest(BaseModel):
    text: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    databaseId: str
    schema_name: Optional[str] = None
    conversationId: Optional[str] = None
    modelId: Optional[str] = None

class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    isPinned: Optional[bool] = None

class SubmitFeedbackRequest(BaseModel):
    messageId: str
    rating: int
    correction: Optional[str] = ''
    conversationId: Optional[str] = None


@ai_bp.get('/models')
def get_models():
    session = SessionLocal()
    try:
        models = session.query(AIModel).all()
        return [m.to_dict() for m in models]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.post('/models', dependencies=[Depends(get_current_user)])
def add_model(data: AddModelRequest):
    session = SessionLocal()
    try:
        new_model = AIModel(
            id=str(uuid.uuid4()),
            name=data.name,
            modelId=data.modelId,
            provider=data.provider,
            description=data.description,
            isActive=True
        )
        session.add(new_model)
        session.commit()
        return {'message': 'Model added successfully'}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.delete('/models/{id}', dependencies=[Depends(get_current_user)])
def delete_model(id: str):
    session = SessionLocal()
    try:
        model = session.query(AIModel).get(id)
        if not model:
            raise HTTPException(status_code=404, detail='Model not found')
        session.delete(model)
        session.commit()
        return {'message': 'Model deleted successfully'}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.post('/generate-sql')
def generate_sql(data: GenerateSqlRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get('userId')
        result = ai_service.generate_sql(data.prompt, data.databaseId, data.schema_name, user_id=user_id, model_id=data.modelId)
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_bp.post('/explain-sql')
def explain_sql(data: ExplainSqlRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get('userId')
        result = ai_service.explain_sql(data.sql, user_id=user_id, model_id=data.modelId)
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_bp.post('/optimize-sql')
def optimize_sql(data: OptimizeSqlRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get('userId')
        result = ai_service.optimize_sql(data.sql, data.databaseId, data.schema_name, user_id=user_id, model_id=data.modelId)
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_bp.post('/fix-sql')
def fix_sql(data: FixSqlRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get('userId')
        result = ai_service.fix_sql(data.sql, data.error, data.databaseId, data.schema_name, user_id=user_id, model_id=data.modelId)
        if 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_bp.post('/complete')
def autocomplete_sql(data: CompleteSqlRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get('userId')
        
        if not data.prefix:
            return {'completion': ''}
            
        result = ai_service.autocomplete_sql(
            db_id=data.databaseId,
            schema=data.schema_name,
            prefix=data.prefix,
            suffix=data.suffix,
            user_id=user_id,
            model_id=data.modelId
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_bp.post('/agent')
def execute_agent(data: ExecuteAgentRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get('userId')
        conv_id = data.conversationId
        
        session = SessionLocal()
        try:
            if not conv_id:
                conv_id = str(uuid.uuid4())
                new_conv = AIConversation(
                    id=conv_id,
                    title=data.prompt[:50] + ("..." if len(data.prompt) > 50 else ""),
                    userId=user_id,
                    databaseId=data.databaseId
                )
                session.add(new_conv)
                session.commit()
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")
        finally:
            session.close()

        result = ai_service.execute_agent(
            data.prompt, 
            data.databaseId, 
            data.schema_name, 
            user_id=user_id, 
            model_id=data.modelId,
            conv_id=conv_id
        )
        
        if isinstance(result, dict):
            result['conversationId'] = conv_id
            
        if result.get('type') == 'error':
            raise HTTPException(status_code=400, detail=result.get('message', 'Unknown error'))
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@ai_bp.post('/stream')
def stream_chat(data: StreamChatRequest, current_user: dict = Depends(get_current_user)):
    messages = data.messages or []
    if not messages and data.text:
        messages = [{'role': 'user', 'content': data.text}]
    
    if not messages:
        raise HTTPException(status_code=400, detail='No messages provided')
        
    user_id = current_user.get('userId')
    db_id = data.databaseId
    model_id = data.modelId
    conv_id = data.conversationId
    last_message = messages[-1]['content']
    
    session = SessionLocal()
    try:
        if not conv_id:
            conv_id = str(uuid.uuid4())
            new_conv = AIConversation(
                id=conv_id,
                title=last_message[:50] + ("..." if len(last_message) > 50 else ""),
                userId=user_id,
                databaseId=db_id
            )
            session.add(new_conv)
            session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {str(e)}")
    finally:
        session.close()

    history = []
    if user_id and conv_id:
        session = SessionLocal()
        try:
            db_history = session.query(AIChatMessage)\
                .filter(AIChatMessage.conversationId == conv_id)\
                .order_by(AIChatMessage.created_on.desc())\
                .limit(10)\
                .all()
            history = [{'role': m.role, 'content': m.content} for m in reversed(db_history)]
        finally:
            session.close()

    ai_service._save_chat("user", last_message, user_id, db_id, conv_id=conv_id)

    def generate():
        full_response = ""
        try:
            import json
            for event, chunk in ai_service.stream_generate_response(
                last_message, 
                db_id=db_id, 
                schema=data.schema_name, 
                model_id=model_id, 
                user_id=user_id,
                history=history,
                conv_id=conv_id
            ):
                full_response += chunk
                # JSON-encode chunk to safely handle newlines and special characters in SSE
                encoded_chunk = json.dumps(chunk)
                yield f"event: {event}\ndata: {encoded_chunk}\n\n"
            
            if full_response:
                ai_service._save_chat("assistant", full_response, user_id, db_id, conv_id=conv_id)
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            ai_service._save_chat("assistant", error_msg, user_id, db_id, conv_id=conv_id)
            yield f"event: error\ndata: {json.dumps(error_msg)}\n\n"

    return StreamingResponse(
        generate(), 
        media_type='text/event-stream', 
        headers={
            'X-Conversation-Id': conv_id,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Accel-Buffering': 'no'
        }
    )


@ai_bp.get('/history')
def get_chat_history(databaseId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    session = SessionLocal()
    try:
        from models.metadata import AIChatMessage
        query = session.query(AIChatMessage).filter(AIChatMessage.userId == user_id)
        if databaseId:
            query = query.filter(AIChatMessage.databaseId == databaseId)
        
        messages = query.order_by(AIChatMessage.created_on.asc()).limit(50).all()
        return [{
            'id': m.id,
            'role': m.role,
            'content': m.content,
            'databaseId': m.databaseId,
            'created_on': m.created_on.isoformat()
        } for m in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.get('/conversations')
def get_conversations(databaseId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    session = SessionLocal()
    try:
        query = session.query(AIConversation).filter(AIConversation.userId == user_id)
        if databaseId:
            query = query.filter(AIConversation.databaseId == databaseId)
        
        conversations = query.order_by(AIConversation.isPinned.desc(), AIConversation.changed_on.desc()).all()
        return [{
            'id': c.id,
            'title': c.title,
            'isPinned': c.isPinned,
            'databaseId': c.databaseId,
            'created_on': c.created_on.isoformat(),
            'changed_on': c.changed_on.isoformat()
        } for c in conversations]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.get('/conversations/{id}')
def get_conversation_messages(id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    session = SessionLocal()
    try:
        conv = session.query(AIConversation).get(id)
        if not conv or conv.userId != user_id:
            raise HTTPException(status_code=404, detail='Conversation not found')
            
        messages = session.query(AIChatMessage)\
            .filter(AIChatMessage.conversationId == id)\
            .order_by(AIChatMessage.created_on.asc())\
            .all()
            
        return {
            'id': conv.id,
            'title': conv.title,
            'isPinned': conv.isPinned,
            'messages': [{
                'id': m.id,
                'role': m.role,
                'content': m.content,
                'created_on': m.created_on.isoformat()
            } for m in messages]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.put('/conversations/{id}')
def update_conversation(id: str, data: UpdateConversationRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    session = SessionLocal()
    try:
        conv = session.query(AIConversation).get(id)
        if not conv or conv.userId != user_id:
            raise HTTPException(status_code=404, detail='Conversation not found')
            
        if data.title is not None:
            conv.title = data.title
        if data.isPinned is not None:
            conv.isPinned = data.isPinned
        
        conv.changed_on = datetime.datetime.utcnow()
        session.commit()
        return {'message': 'Conversation updated successfully'}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.delete('/conversations/{id}')
def delete_conversation(id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    session = SessionLocal()
    try:
        conv = session.query(AIConversation).get(id)
        if not conv or conv.userId != user_id:
            raise HTTPException(status_code=404, detail='Conversation not found')
            
        session.delete(conv)
        session.commit()
        return {'message': 'Conversation deleted successfully'}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

@ai_bp.post('/feedback')
def submit_feedback(data: SubmitFeedbackRequest, current_user: dict = Depends(get_current_user)):
    """Save user feedback (thumbs up/down) on AI responses."""
    user_id = current_user.get('userId')
    
    if data.rating not in [1, -1]:
        raise HTTPException(status_code=400, detail='rating (1 or -1) is required')
    
    session = SessionLocal()
    try:
        existing = session.query(AIFeedback).filter_by(
            messageId=data.messageId, userId=user_id
        ).first()
        
        if existing:
            existing.rating = data.rating
            existing.correction = data.correction if data.rating == -1 else None
        else:
            feedback = AIFeedback(
                id=str(uuid.uuid4()),
                messageId=data.messageId,
                conversationId=data.conversationId,
                userId=user_id,
                rating=data.rating,
                correction=data.correction if data.rating == -1 else None
            )
            session.add(feedback)
        
        session.commit()
        return {'message': 'Feedback saved', 'rating': data.rating}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()
