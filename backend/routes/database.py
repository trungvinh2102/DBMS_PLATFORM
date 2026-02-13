"""
backend/routes/database.py

API endpoints for database operations, mapping to services.
"""

from flask import Blueprint, request, jsonify
from services.connection import connection_service
from services.metadata import metadata_service
from services.execution import execution_service

database_bp = Blueprint('database', __name__)

@database_bp.route('/list', methods=['GET'])
def list_databases():
    """List all database connections."""
    try:
        dbs = connection_service.list_databases()
        return jsonify(dbs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/create', methods=['POST'])
def create_database():
    """Create a new database connection."""
    data = request.json
    try:
        result = connection_service.create_database(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/update', methods=['POST'])
def update_database():
    """Update an existing database connection."""
    data = request.json
    try:
        result = connection_service.update_database(data['id'], data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/delete', methods=['POST'])
def delete_database():
    """Delete a database connection."""
    data = request.json
    try:
        connection_service.delete_database(data['id'])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/test', methods=['POST'])
def test_connection():
    """Test a database connection."""
    data = request.json
    try:
        result = connection_service.test_connection(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/schemas', methods=['GET'])
def get_schemas():
    """Get schemas for a database."""
    db_id = request.args.get('databaseId')
    if not db_id: return jsonify({'error': 'databaseId required'}), 400
    try:
        schemas = metadata_service.get_schemas(db_id)
        return jsonify(schemas)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/tables', methods=['GET'])
def get_tables():
    """Get tables for a specific schema."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    try:
        tables = metadata_service.get_tables(db_id, schema)
        return jsonify(tables)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/columns', methods=['GET'])
def get_columns():
    """Get columns for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    if not table: return jsonify({'error': 'table required'}), 400
    try:
        columns = metadata_service.get_columns(db_id, schema, table)
        return jsonify(columns)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/indexes', methods=['GET'])
def get_indexes():
    """Get indexes for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    try:
        indexes = metadata_service.get_indexes(db_id, schema, table)
        return jsonify(indexes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/foreign-keys', methods=['GET'])
def get_foreign_keys():
    """Get foreign keys for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    try:
        fks = metadata_service.get_foreign_keys(db_id, schema, table)
        return jsonify(fks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/table-info', methods=['GET'])
def get_table_info():
    """Get statistics for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    try:
        info = metadata_service.get_table_info(db_id, schema, table)
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/ddl', methods=['GET'])
def get_ddl():
    """Get CREATE TABLE DDL for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    try:
        ddl = metadata_service.get_table_ddl(db_id, schema, table)
        return jsonify(ddl)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/execute', methods=['POST'])
def execute_query():
    """Execute a SQL query."""
    data = request.json
    db_id = data.get('databaseId')
    sql = data.get('sql')
    try:
        result = execution_service.execute_query(db_id, sql)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/history', methods=['GET'])
def get_history():
    """Get query execution history."""
    db_id = request.args.get('databaseId')
    try:
        history = execution_service.get_query_history(db_id)
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/save-query', methods=['POST'])
def save_query():
    """Save a query."""
    data = request.json
    try:
        result = execution_service.save_query(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/saved-queries', methods=['GET'])
def list_saved_queries():
    """List saved queries."""
    db_id = request.args.get('databaseId')
    user_id = request.args.get('userId')
    try:
        queries = execution_service.list_saved_queries(db_id, user_id)
        return jsonify(queries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


