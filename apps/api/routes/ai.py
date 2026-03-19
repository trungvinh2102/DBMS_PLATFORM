
"""
backend/routes/ai.py
"""
import os
from flask import Blueprint, request, jsonify
from services.ai_service import ai_service
from utils.auth_middleware import login_required

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/generate-sql', methods=['POST'])
@login_required
def generate_sql():
    data = request.json
    try:
        result = ai_service.generate_sql(data['prompt'], data['databaseId'], data.get('schema', 'public'))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/explain-sql', methods=['POST'])
@login_required
def explain_sql():
    data = request.json
    try:
        result = ai_service.explain_sql(data['sql'])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/optimize-sql', methods=['POST'])
@login_required
def optimize_sql():
    data = request.json
    try:
        result = ai_service.optimize_sql(data['sql'], data['databaseId'], data.get('schema', 'public'))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/fix-sql', methods=['POST'])
@login_required
def fix_sql():
    data = request.json
    try:
        result = ai_service.fix_sql(data['sql'], data['error'], data['databaseId'], data.get('schema', 'public'))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/', methods=['POST'])
@login_required
def chat():
    data = request.json
    messages = data.get('messages', [])
    if not messages and 'text' in data:
        # Support for { text: '...' } format
        messages = [{'role': 'user', 'content': data['text']}]
    
    if not messages:
        return jsonify({'error': 'No messages provided'}), 400
        
    try:
        # Get the last message
        last_message = messages[-1]['content']
        # Simple for now, non-streaming but compatible with the format
        result = ai_service._generate_response(last_message)
        
        # Return in format expected by useChat
        return jsonify({
            'id': 'msg-' + os.urandom(4).hex(),
            'role': 'assistant',
            'content': [{'type': 'text', 'text': result}]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
