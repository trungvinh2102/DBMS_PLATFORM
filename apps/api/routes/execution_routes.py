"""
execution_routes.py

API routes for query execution, history management, and saved queries.
"""

from flask import Blueprint, request, jsonify
from services.execution import execution_service
from utils.auth_middleware import login_required

execution_bp = Blueprint('execution', __name__)

@execution_bp.before_request
@login_required
def require_auth():
    """Ensure all execution-related routes require authentication."""
    pass

@execution_bp.route('/execute', methods=['POST'])
def execute_query():
    """Executes a SQL/MQL query against the specified database instance."""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request body'}), 400
    db_id = data.get('databaseId')
    sql = data.get('sql')
    if not db_id or not sql:
        return jsonify({'error': 'databaseId and sql are both required'}), 400

    auto_commit = data.get('autoCommit', True)
    limit = data.get('limit', 1000)
    try:
        result = execution_service.execute_query(db_id, sql, auto_commit, limit)
        return jsonify(result)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@execution_bp.route('/explain', methods=['POST'])
def explain_query():
    """Generates an EXPLAIN plan for a given query and returns performance metrics."""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request body'}), 400
    db_id = data.get('databaseId')
    sql = data.get('sql')
    if not db_id or not sql:
        return jsonify({'error': 'databaseId and sql are both required'}), 400

    try:
        result = execution_service.get_explain_plan(db_id, sql)
        return jsonify(result)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@execution_bp.route('/history', methods=['GET'])
def get_history():
    """Retrieves previous query execution history for the given user/database."""
    db_id = request.args.get('databaseId')
    try:
        history = execution_service.get_query_history(db_id)
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@execution_bp.route('/save-query', methods=['POST'])
def save_query():
    """Saves a SQL query with a custom label for reuse or future reference."""
    data = request.json
    required = ('sql', 'name', 'databaseId')
    if not data or not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields: sql, name, databaseId'}), 400
    try:
        result = execution_service.save_query(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@execution_bp.route('/saved-queries', methods=['GET'])
def list_saved_queries():
    """Lists all saved queries filtered by database or user."""
    db_id = request.args.get('databaseId')
    user_id = request.args.get('userId')
    try:
        queries = execution_service.list_saved_queries(db_id, user_id)
        return jsonify(queries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
