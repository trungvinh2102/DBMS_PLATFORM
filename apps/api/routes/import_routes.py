import os
import uuid
import tempfile
import json
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from services.import_service import import_service
from utils.auth_middleware import get_current_user

import_bp = APIRouter()

UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'quriodb_uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@import_bp.post('/import')
async def import_data(
    file: UploadFile = File(...),
    databaseId: str = Form(...),
    tableName: str = Form(...),
    schemaName: str = Form("public"),
    format: str = Form("csv"),
    mapping: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to trigger a data import job.
    Expects multipart/form-data.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail='No selected file')

    if not databaseId or not tableName:
        raise HTTPException(status_code=400, detail='databaseId and tableName are required')

    mapping_obj = json.loads(mapping) if mapping else None

    # Save file temporarily
    filename = f"{uuid.uuid4()}_{file.filename.replace('/', '_').replace(chr(92), '_')}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = import_service.start_import(
            database_id=databaseId,
            table_name=tableName,
            schema_name=schemaName,
            file_path=file_path,
            format=format,
            mapping=mapping_obj
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@import_bp.get('/import/status/{job_id}')
def get_import_status(job_id: str, current_user: dict = Depends(get_current_user)):
    status = import_service.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail='Job not found')
    return status
