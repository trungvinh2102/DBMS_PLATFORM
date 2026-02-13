"""
ai.py

AI assistance endpoints for SQL generation, explanation, and optimization.
"""

from flask import Blueprint, request, jsonify
from services.ai_service import ai_service
from utils.auth_middleware import login_required
from utils.db_utils import handle_api_exceptions

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/generate-sql', methods=['POST'])
@login_required
@handle_api_exceptions
def generate_sql():
    """Generates SQL from a natural language prompt."""
    data = request.json
    result = ai_service.generate_sql(data['prompt'], data['databaseId'], data.get('schema', 'public'))
    return jsonify(result)

@ai_bp.route('/explain-sql', methods=['POST'])
@login_required
@handle_api_exceptions
def explain_sql():
    """Explains the given SQL query."""
    data = request.json
    result = ai_service.explain_sql(data['sql'])
    return jsonify(result)

@ai_bp.route('/optimize-sql', methods=['POST'])
@login_required
@handle_api_exceptions
def optimize_sql():
    """Optimizes the given SQL query."""
    data = request.json
    result = ai_service.optimize_sql(data['sql'], data['databaseId'], data.get('schema', 'public'))
    return jsonify(result)
