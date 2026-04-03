
"""
backend/routes/ai.py
"""
import os
from flask import Blueprint, request, jsonify, g, Response, stream_with_context
from services.ai_service import ai_service
from models.metadata import AIChatMessage, AIConversation, AIFeedback
from utils.auth_middleware import login_required
from models.metadata import AIModel, SessionLocal
import uuid
import datetime

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/models', methods=['GET'])
# @login_required # Removed as per instruction snippet
def get_models(): # Renamed from list_models as per instruction snippet
    session = SessionLocal()
    try:
        # Use more permissive query to avoid failing if isActive is missing in DB
        models = session.query(AIModel).all()
        return jsonify([m.to_dict() for m in models])
    except Exception as e:
        # Debugging in case it still fails
        return jsonify({'error': str(e), 'type': 'AIModelError'}), 500
    finally:
        session.close()

@ai_bp.route('/models', methods=['POST'])
@login_required # Ideally admin_required, but keep it simple for now
def add_model():
    data = request.json
    session = SessionLocal()
    try:
        new_model = AIModel(
            id=str(uuid.uuid4()),
            name=data.get('name'),
            modelId=data.get('modelId'),
            provider=data.get('provider', 'Google'),
            description=data.get('description'),
            isActive=True
        )
        session.add(new_model)
        session.commit()
        return jsonify({'message': 'Model added successfully'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@ai_bp.route('/models/<id>', methods=['DELETE'])
@login_required
def delete_model(id):
    session = SessionLocal()
    try:
        model = session.query(AIModel).get(id)
        if not model:
            return jsonify({'error': 'Model not found'}), 404
        session.delete(model)
        session.commit()
        return jsonify({'message': 'Model deleted successfully'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@ai_bp.route('/generate-sql', methods=['POST'])
@login_required
def generate_sql():
    data = request.json
    try:
        user_id = g.user.get('userId') if hasattr(g, 'user') else None
        model_id = data.get('modelId')
        result = ai_service.generate_sql(data['prompt'], data['databaseId'], data.get('schema', 'public'), user_id=user_id, model_id=model_id)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/explain-sql', methods=['POST'])
@login_required
def explain_sql():
    data = request.json
    try:
        user_id = g.user.get('userId') if hasattr(g, 'user') else None
        model_id = data.get('modelId')
        result = ai_service.explain_sql(data['sql'], user_id=user_id, model_id=model_id)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/optimize-sql', methods=['POST'])
@login_required
def optimize_sql():
    data = request.json
    try:
        user_id = g.user.get('userId') if hasattr(g, 'user') else None
        model_id = data.get('modelId')
        result = ai_service.optimize_sql(data['sql'], data['databaseId'], data.get('schema', 'public'), user_id=user_id, model_id=model_id)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/fix-sql', methods=['POST'])
@login_required
def fix_sql():
    data = request.json
    try:
        user_id = g.user.get('userId') if hasattr(g, 'user') else None
        model_id = data.get('modelId')
        result = ai_service.fix_sql(data['sql'], data['error'], data['databaseId'], data.get('schema', 'public'), user_id=user_id, model_id=model_id)
        if 'error' in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/complete', methods=['POST'])
@login_required
def autocomplete_sql():
    data = request.json
    try:
        user_id = g.user.get('userId') if hasattr(g, 'user') else None
        model_id = data.get('modelId')
        prefix = data.get('prefix', '')
        suffix = data.get('suffix', '')
        
        if not prefix:
            return jsonify({'completion': ''})
            
        result = ai_service.autocomplete_sql(
            db_id=data.get('databaseId'),
            schema=data.get('schema', 'public'),
            prefix=prefix,
            suffix=suffix,
            user_id=user_id,
            model_id=model_id
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e), 'completion': ''}), 500

@ai_bp.route('/agent', methods=['POST'])
@login_required
def execute_agent():
    data = request.json
    try:
        user_id = g.user.get('userId') if hasattr(g, 'user') else None
        db_id = data['databaseId']
        model_id = data.get('modelId')
        conv_id = data.get('conversationId')
        prompt = data['prompt']
        
        session = SessionLocal()
        try:
            if not conv_id:
                conv_id = str(uuid.uuid4())
                new_conv = AIConversation(
                    id=conv_id,
                    title=prompt[:50] + ("..." if len(prompt) > 50 else ""),
                    userId=user_id,
                    databaseId=db_id
                )
                session.add(new_conv)
                session.commit()
        except Exception as e:
            session.rollback()
            return jsonify({'type': 'error', 'message': f"Failed to create conversation: {str(e)}"}), 500
        finally:
            session.close()

        # Call the new execute_agent method which handles generation, execution and self-correction
        result = ai_service.execute_agent(
            prompt, 
            db_id, 
            data.get('schema', 'public'), 
            user_id=user_id, 
            model_id=model_id,
            conv_id=conv_id
        )
        
        # Add conv_id to result so the frontend knows which chat it belongs to
        if isinstance(result, dict):
            result['conversationId'] = conv_id
            
        status_code = 200 if result.get('type') != 'error' else 400
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'type': 'error', 'message': str(e)}), 500

@ai_bp.route('/stream', methods=['POST'])
@login_required
def stream_chat():
    data = request.json
    messages = data.get('messages', [])
    if not messages and 'text' in data:
        messages = [{'role': 'user', 'content': data['text']}]
    
    if not messages:
        return jsonify({'error': 'No messages provided'}), 400
        
    user_id = g.user.get('userId') if hasattr(g, 'user') else None
    db_id = data.get('databaseId')
    model_id = data.get('modelId')
    conv_id = data.get('conversationId')
    last_message = messages[-1]['content']
    
    session = SessionLocal()
    try:
        # If no conv_id, create a new conversation
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
        return jsonify({'error': f"Failed to create conversation: {str(e)}"}), 500
    finally:
        session.close()

    # Fetch recent history from DB for context (last 10 messages)
    history = []
    if user_id and conv_id:
        session = SessionLocal()
        try:
            db_history = session.query(AIChatMessage)\
                .filter(AIChatMessage.conversationId == conv_id)\
                .order_by(AIChatMessage.created_on.desc())\
                .limit(10)\
                .all()
            # Convert to chronological order
            history = [{'role': m.role, 'content': m.content} for m in reversed(db_history)]
        finally:
            session.close()

    # Save user message
    ai_service._save_chat("user", last_message, user_id, db_id, conv_id=conv_id)

    def generate():
        full_response = ""
        try:
            for chunk in ai_service.stream_generate_response(
                last_message, 
                db_id=db_id, 
                schema=data.get('schema', 'public'), 
                model_id=model_id, 
                user_id=user_id,
                history=history,
                conv_id=conv_id
            ):
                full_response += chunk
                yield chunk
            
            # Save assistant response after stream completion
            if full_response:
                ai_service._save_chat("assistant", full_response, user_id, db_id, conv_id=conv_id)
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            ai_service._save_chat("assistant", error_msg, user_id, db_id, conv_id=conv_id)
            yield error_msg

    return Response(stream_with_context(generate()), mimetype='text/plain', headers={
        'X-Conversation-Id': conv_id,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Accel-Buffering': 'no'
    })


@ai_bp.route('/history', methods=['GET'])
@login_required
def get_chat_history():
    user_id = g.user.get('userId')
    db_id = request.args.get('databaseId')
    session = SessionLocal()
    try:
        from models.metadata import AIChatMessage
        query = session.query(AIChatMessage).filter(AIChatMessage.userId == user_id)
        if db_id:
            query = query.filter(AIChatMessage.databaseId == db_id)
        
        # Limit to last 50 messages to keep UI responsive
        messages = query.order_by(AIChatMessage.created_on.asc()).limit(50).all()
        return jsonify([{
            'id': m.id,
            'role': m.role,
            'content': m.content,
            'databaseId': m.databaseId,
            'created_on': m.created_on.isoformat()
        } for m in messages])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@ai_bp.route('/conversations', methods=['GET'])
@login_required
def get_conversations():
    user_id = g.user.get('userId')
    db_id = request.args.get('databaseId')
    session = SessionLocal()
    try:
        query = session.query(AIConversation).filter(AIConversation.userId == user_id)
        if db_id:
            query = query.filter(AIConversation.databaseId == db_id)
        
        # Sort by pinned then latest
        conversations = query.order_by(AIConversation.isPinned.desc(), AIConversation.changed_on.desc()).all()
        return jsonify([{
            'id': c.id,
            'title': c.title,
            'isPinned': c.isPinned,
            'databaseId': c.databaseId,
            'created_on': c.created_on.isoformat(),
            'changed_on': c.changed_on.isoformat()
        } for c in conversations])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@ai_bp.route('/conversations/<id>', methods=['GET'])
@login_required
def get_conversation_messages(id):
    user_id = g.user.get('userId')
    session = SessionLocal()
    try:
        conv = session.query(AIConversation).get(id)
        if not conv or conv.userId != user_id:
            return jsonify({'error': 'Conversation not found'}), 404
            
        messages = session.query(AIChatMessage)\
            .filter(AIChatMessage.conversationId == id)\
            .order_by(AIChatMessage.created_on.asc())\
            .all()
            
        return jsonify({
            'id': conv.id,
            'title': conv.title,
            'isPinned': conv.isPinned,
            'messages': [{
                'id': m.id,
                'role': m.role,
                'content': m.content,
                'created_on': m.created_on.isoformat()
            } for m in messages]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@ai_bp.route('/conversations/<id>', methods=['PUT'])
@login_required
def update_conversation(id):
    data = request.json
    user_id = g.user.get('userId')
    session = SessionLocal()
    try:
        conv = session.query(AIConversation).get(id)
        if not conv or conv.userId != user_id:
            return jsonify({'error': 'Conversation not found'}), 404
            
        if 'title' in data:
            conv.title = data['title']
        if 'isPinned' in data:
            conv.isPinned = data['isPinned']
        
        conv.changed_on = datetime.datetime.utcnow()
        session.commit()
        return jsonify({'message': 'Conversation updated successfully'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@ai_bp.route('/conversations/<id>', methods=['DELETE'])
@login_required
def delete_conversation(id):
    user_id = g.user.get('userId')
    session = SessionLocal()
    try:
        conv = session.query(AIConversation).get(id)
        if not conv or conv.userId != user_id:
            return jsonify({'error': 'Conversation not found'}), 404
            
        session.delete(conv)
        session.commit()
        return jsonify({'message': 'Conversation deleted successfully'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

# ─── AI Feedback ──────────────────────────────────────────────

@ai_bp.route('/feedback', methods=['POST'])
@login_required
def submit_feedback():
    """Save user feedback (thumbs up/down) on AI responses."""
    data = request.json
    user_id = g.user.get('userId')
    
    message_id = data.get('messageId')
    rating = data.get('rating')  # 1 = positive, -1 = negative
    correction = data.get('correction', '')
    conversation_id = data.get('conversationId')
    
    if not message_id or rating not in [1, -1]:
        return jsonify({'error': 'messageId and rating (1 or -1) are required'}), 400
    
    session = SessionLocal()
    try:
        # Upsert: update if exists, create if not
        existing = session.query(AIFeedback).filter_by(
            messageId=message_id, userId=user_id
        ).first()
        
        if existing:
            existing.rating = rating
            existing.correction = correction if rating == -1 else None
        else:
            feedback = AIFeedback(
                id=str(uuid.uuid4()),
                messageId=message_id,
                conversationId=conversation_id,
                userId=user_id,
                rating=rating,
                correction=correction if rating == -1 else None
            )
            session.add(feedback)
        
        session.commit()
        return jsonify({'message': 'Feedback saved', 'rating': rating})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

