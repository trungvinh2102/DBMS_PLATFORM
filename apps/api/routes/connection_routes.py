"""
connection_routes.py

API routes for database connection management (CRUD).
"""

from flask import Blueprint, request, jsonify
from services.connection import connection_service
from utils.auth_middleware import login_required, admin_required

connection_bp = Blueprint('connection', __name__)

@connection_bp.before_request
@login_required
def require_auth():
    """Ensure all connection routes require authentication."""
    pass

@connection_bp.route('/list', methods=['GET'])
def list_databases():
    """Returns a list of all database connections configured in the system."""
    try:
        dbs = connection_service.list_databases()
        return jsonify(dbs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@connection_bp.route('/create', methods=['POST'])
@admin_required
def create_database():
    """Registers a new database connection into the system."""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request body'}), 400
    try:
        result = connection_service.create_database(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@connection_bp.route('/update', methods=['POST'])
@admin_required
def update_database():
    """Updates an existing database connection configuration."""
    data = request.json
    if not data or 'id' not in data:
        return jsonify({'error': 'Database ID required'}), 400
    try:
        result = connection_service.update_database(data['id'], data)
        return jsonify(result)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@connection_bp.route('/delete', methods=['POST'])
@admin_required
def delete_database():
    """Removes a database connection and its associated history records."""
    data = request.json
    if not data or 'id' not in data:
        return jsonify({'error': 'Database ID required'}), 400
    try:
        connection_service.delete_database(data['id'])
        return jsonify({'success': True})
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@connection_bp.route('/test', methods=['POST'])
@admin_required
def test_connection():
    """Executes a connectivity test for the provided connection configuration."""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request body'}), 400
    try:
        result = connection_service.test_connection(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@connection_bp.route('/connect-local', methods=['POST'])
def connect_local():
    """Connects to a local SQLite or DuckDB file."""
    data = request.json
    if not data or 'path' not in data or 'type' not in data:
        return jsonify({'error': 'path and type (sqlite/duckdb) are required'}), 400
    
    from services.local_db_service import local_db_service
    try:
        result = local_db_service.connect_external_file(
            path=data['path'],
            db_type=data['type'],
            name=data.get('name')
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
