"""
data_access_routes.py

API routes for Data Access Control management.
"""
from flask import Blueprint, request, jsonify
from services.data_access_service import DataAccessService
from models.metadata import get_db, SessionLocal
from models.data_access_models import SensitivityLevel, MaskingType, PolicySubjectType

data_access_bp = Blueprint('data_access', __name__)

@data_access_bp.route('/resources', methods=['GET'])
def get_resources():
    session = SessionLocal()
    service = DataAccessService(session)
    try:
        database_id = request.args.get('databaseId')
        resources = service.get_data_resources(database_id)
        return jsonify([{
            'id': r.id,
            'databaseId': r.databaseId,
            'schemaName': r.schemaName,
            'tableName': r.tableName,
            'columnName': r.columnName,
            'resourceType': r.resourceType,
            'sensitivity': r.sensitivity.value,
            'tags': r.tags,
            'description': r.description
        } for r in resources])
    finally:
        session.close()

@data_access_bp.route('/resources', methods=['POST'])
def create_resource():
    session = SessionLocal()
    service = DataAccessService(session)
    try:
        data = request.json
        resource = service.create_data_resource(
            database_id=data['databaseId'],
            schema_name=data['schemaName'],
            table_name=data['tableName'],
            resource_type=data['resourceType'],
            column_name=data.get('columnName'),
            sensitivity=SensitivityLevel(data.get('sensitivity', 'INTERNAL')),
            description=data.get('description'),
            tags=data.get('tags')
        )
        return jsonify({'id': resource.id, 'status': 'created'}), 201
    finally:
        session.close()

@data_access_bp.route('/masking-policies', methods=['GET'])
def get_masking_policies():
    session = SessionLocal()
    service = DataAccessService(session)
    try:
        policies = service.get_masking_policies()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'maskingType': p.maskingType.value,
            'parameters': p.parameters,
            'description': p.description
        } for p in policies])
    finally:
        session.close()

@data_access_bp.route('/masking-policies', methods=['POST'])
def create_masking_policy():
    session = SessionLocal()
    service = DataAccessService(session)
    try:
        data = request.json
        policy = service.create_masking_policy(
            name=data['name'],
            masking_type=MaskingType(data['maskingType']),
            description=data.get('description'),
            parameters=data.get('parameters'),
            condition=data.get('condition')
        )
        return jsonify({'id': policy.id, 'status': 'created'}), 201
    finally:
        session.close()

@data_access_bp.route('/policies', methods=['GET'])
def get_access_policies():
    session = SessionLocal()
    service = DataAccessService(session)
    try:
        policies = service.get_access_policies()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'subjectType': p.subjectType.value,
            'subjectId': p.subjectId,
            'privilegeCode': p.privilegeCode,
            'resourceId': p.resourceId,
            'maskingPolicyId': p.maskingPolicyId,
            'environmentCondition': p.environmentCondition,
            'priority': p.priority,
            'isActive': p.isActive
        } for p in policies])
    finally:
        session.close()

@data_access_bp.route('/policies', methods=['POST'])
def create_access_policy():
    session = SessionLocal()
    service = DataAccessService(session)
    try:
        data = request.json
        policy = service.create_access_policy(
            name=data['name'],
            subject_type=PolicySubjectType(data['subjectType']),
            subject_id=data['subjectId'],
            privilege_code=data['privilegeCode'],
            resource_id=data.get('resourceId'),
            masking_policy_id=data.get('maskingPolicyId'),
            environment_condition=data.get('environmentCondition'),
            priority=data.get('priority', 0)
        )
        return jsonify({'id': policy.id, 'status': 'created'}), 201
    finally:
        session.close()
