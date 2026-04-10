import os
import uuid
from flask import Blueprint, request, jsonify
from services.import_service import import_service
from utils.auth_middleware import login_required
from werkzeug.utils import secure_filename

import_bp = Blueprint('import', __name__)

UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@import_bp.route('/import', methods=['POST'])
@login_required
def import_data():
    """
    Endpoint to trigger a data import job.
    Expects multipart/form-data.
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    database_id = request.form.get('databaseId')
    table_name = request.form.get('tableName')
    schema_name = request.form.get('schemaName', 'public')
    file_format = request.form.get('format', 'csv')
    mapping_str = request.form.get('mapping') # JSON string

    if not database_id or not table_name:
        return jsonify({'error': 'databaseId and tableName are required'}), 400

    import json
    mapping = json.loads(mapping_str) if mapping_str else None

    # Save file temporarily
    filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    try:
        result = import_service.start_import(
            database_id=database_id,
            table_name=table_name,
            schema_name=schema_name,
            file_path=file_path,
            format=file_format,
            mapping=mapping
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@import_bp.route('/import/status/<job_id>', methods=['GET'])
@login_required
def get_import_status(job_id):
    status = import_service.get_job_status(job_id)
    if not status:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(status)
