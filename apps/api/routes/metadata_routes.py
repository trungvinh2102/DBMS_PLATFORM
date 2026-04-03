"""
metadata_routes.py

API routes for database schema and object discovery (metadata).
"""

from flask import Blueprint, request, jsonify
from services.metadata import metadata_service
from utils.auth_middleware import login_required

metadata_bp = Blueprint('metadata', __name__)

@metadata_bp.before_request
@login_required
def require_auth():
    """Ensure all metadata discovery routes require authentication."""
    pass

@metadata_bp.route('/schemas', methods=['GET'])
def get_schemas():
    """Retrieves all schema names from the specified database."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    try:
        schemas = metadata_service.get_schemas(db_id)
        return jsonify(schemas)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/tables', methods=['GET'])
def get_tables():
    """Retrieves all table names within a specific schema."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        tables = metadata_service.get_tables(db_id, schema)
        return jsonify(tables)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/columns', methods=['GET'])
def get_columns():
    """Fetches column details (name, type, indices) for a given table."""
    db_id = request.args.get('databaseId')
    table = request.args.get('table')
    if not db_id or not table:
        return jsonify({'error': 'databaseId and table are both required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        columns = metadata_service.get_columns(db_id, schema, table)
        return jsonify(columns)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/all-columns', methods=['GET'])
def get_all_columns():
    """Returns columns for all tables in the entire schema, for schema visualization."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        all_columns = metadata_service.get_all_columns(db_id, schema)
        return jsonify(all_columns)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/ddl', methods=['GET'])
def get_ddl():
    """Generates the CREATE TABLE DDL statement for the requested table."""
    db_id = request.args.get('databaseId')
    table = request.args.get('table')
    if not db_id or not table:
        return jsonify({'error': 'databaseId and table are both required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        ddl = metadata_service.get_table_ddl(db_id, schema, table)
        return jsonify(ddl)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/views', methods=['GET'])
def get_views():
    """Retrieves all defined database views within a specific schema."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        views = metadata_service.get_views(db_id, schema)
        return jsonify(views)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/functions', methods=['GET'])
def get_functions():
    """Retrieves all stored functions within a specific schema."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        functions = metadata_service.get_functions(db_id, schema)
        return jsonify(functions)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/procedures', methods=['GET'])
def get_procedures():
    """Retrieves all stored procedures within a specific schema."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        procedures = metadata_service.get_procedures(db_id, schema)
        return jsonify(procedures)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/triggers', methods=['GET'])
def get_triggers():
    """Retrieves all triggers defined on tables within a specific schema."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        triggers = metadata_service.get_triggers(db_id, schema)
        return jsonify(triggers)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/events', methods=['GET'])
def get_events():
    """Retrieves scheduled database events within a specific schema."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        events = metadata_service.get_events(db_id, schema)
        return jsonify(events)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/all-foreign-keys', methods=['GET'])
def get_all_foreign_keys():
    """Returns all foreign keys for the entire schema, for schema visualization."""
    db_id = request.args.get('databaseId')
    if not db_id:
        return jsonify({'error': 'databaseId required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        fks = metadata_service.get_all_foreign_keys(db_id, schema)
        return jsonify(fks)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/indexes', methods=['GET'])
def get_indexes():
    """Retrieves all indices (primary, unique, secondary) for a given table."""
    db_id = request.args.get('databaseId')
    table = request.args.get('table')
    if not db_id or not table:
        return jsonify({'error': 'databaseId and table are both required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        indexes = metadata_service.get_indexes(db_id, schema, table)
        return jsonify(indexes)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/foreign-keys', methods=['GET'])
def get_foreign_keys():
    """Retrieves foreign key constraints defined specifically for a given table."""
    db_id = request.args.get('databaseId')
    table = request.args.get('table')
    if not db_id or not table:
        return jsonify({'error': 'databaseId and table are both required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        fks = metadata_service.get_foreign_keys(db_id, schema, table)
        return jsonify(fks)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/table-info', methods=['GET'])
def get_table_info():
    """Retrieves metadata statistics and size estimate for a given table."""
    db_id = request.args.get('databaseId')
    table = request.args.get('table')
    if not db_id or not table:
        return jsonify({'error': 'databaseId and table are both required'}), 400
    schema = request.args.get('schema', 'public')
    try:
        info = metadata_service.get_table_info(db_id, schema, table)
        return jsonify(info)
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        return jsonify({'error': str(e)}), status

@metadata_bp.route('/diagnostics', methods=['GET'])
def get_diagnostics():
    """Retrieves advanced statistical profiling (histograms) for a table."""
    db_id = request.args.get('databaseId')
    table = request.args.get('table')
    if not db_id or not table:
        return jsonify({'error': 'databaseId and table are both required'}), 400
    
    from services.local_db_service import local_db_service
    try:
        diagnostics = local_db_service.get_diagnostics(db_id, table)
        return jsonify(diagnostics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
