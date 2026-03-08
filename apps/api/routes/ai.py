
"""
backend/routes/ai.py
"""
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
