"""
database.py

API endpoints for database operations, mapping to services.
"""

from flask import Blueprint, request, jsonify, g
from services.connection import connection_service
from services.metadata import metadata_service
from services.execution import execution_service
from utils.db_utils import handle_api_exceptions
from utils.auth_middleware import login_required

database_bp = Blueprint('database', __name__)

@database_bp.route('/list', methods=['GET'])
@handle_api_exceptions
def list_databases():
    """List all database connections."""
    dbs = connection_service.list_databases()
    return jsonify(dbs)

@database_bp.route('/create', methods=['POST'])
@handle_api_exceptions
def create_database():
    """Create a new database connection."""
    data = request.json
    result = connection_service.create_database(data)
    return jsonify(result)

@database_bp.route('/update', methods=['POST'])
@handle_api_exceptions
def update_database():
    """Update an existing database connection."""
    data = request.json
    result = connection_service.update_database(data['id'], data)
    return jsonify(result)

@database_bp.route('/delete', methods=['POST'])
@handle_api_exceptions
def delete_database():
    """Delete a database connection."""
    data = request.json
    connection_service.delete_database(data['id'])
    return jsonify({'success': True})

@database_bp.route('/test', methods=['POST'])
@handle_api_exceptions
def test_connection():
    """Test a database connection."""
    data = request.json
    result = connection_service.test_connection(data)
    return jsonify(result)

@database_bp.route('/schemas', methods=['GET'])
@handle_api_exceptions
def get_schemas():
    """Get schemas for a database."""
    db_id = request.args.get('databaseId')
    if not db_id: return jsonify({'error': 'databaseId required'}), 400
    schemas = metadata_service.get_schemas(db_id)
    return jsonify(schemas)

@database_bp.route('/tables', methods=['GET'])
@handle_api_exceptions
def get_tables():
    """Get tables for a specific schema."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    tables = metadata_service.get_tables(db_id, schema)
    return jsonify(tables)

@database_bp.route('/columns', methods=['GET'])
@handle_api_exceptions
def get_columns():
    """Get columns for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    if not table: return jsonify({'error': 'table required'}), 400
    columns = metadata_service.get_columns(db_id, schema, table)
    return jsonify(columns)

@database_bp.route('/indexes', methods=['GET'])
@handle_api_exceptions
def get_indexes():
    """Get indexes for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    indexes = metadata_service.get_indexes(db_id, schema, table)
    return jsonify(indexes)

@database_bp.route('/foreign-keys', methods=['GET'])
@handle_api_exceptions
def get_foreign_keys():
    """Get foreign keys for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    fks = metadata_service.get_foreign_keys(db_id, schema, table)
    return jsonify(fks)

@database_bp.route('/table-info', methods=['GET'])
@handle_api_exceptions
def get_table_info():
    """Get statistics for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    info = metadata_service.get_table_info(db_id, schema, table)
    return jsonify(info)

@database_bp.route('/ddl', methods=['GET'])
@handle_api_exceptions
def get_ddl():
    """Get CREATE TABLE DDL for a specific table."""
    db_id = request.args.get('databaseId')
    schema = request.args.get('schema', 'public')
    table = request.args.get('table')
    ddl = metadata_service.get_table_ddl(db_id, schema, table)
    return jsonify(ddl)

@database_bp.route('/execute', methods=['POST'])
@login_required
@handle_api_exceptions
def execute_query():
    """Execute a SQL query."""
    data = request.json
    db_id = data.get('databaseId')
    sql = data.get('sql')
    user_id = g.user.get('userId')
    result = execution_service.execute_query(db_id, sql, user_id=user_id)
    return jsonify(result)

@database_bp.route('/history', methods=['GET'])
@handle_api_exceptions
def get_history():
    """Get query execution history."""
    db_id = request.args.get('databaseId')
    history = execution_service.get_query_history(db_id)
    return jsonify(history)

@database_bp.route('/save-query', methods=['POST'])
@handle_api_exceptions
def save_query():
    """Save a query."""
    data = request.json
    result = execution_service.save_query(data)
    return jsonify(result)

@database_bp.route('/saved-queries', methods=['GET'])
@handle_api_exceptions
def list_saved_queries():
    """List saved queries."""
    db_id = request.args.get('databaseId')
    user_id = request.args.get('userId')
    queries = execution_service.list_saved_queries(db_id, user_id)
    return jsonify(queries)



