"""
sensitive_data_routes.py

API routes for Sensitive Data management.
"""
from flask import Blueprint, request, jsonify
from services.sensitive_data_service import SensitiveDataService
from models.metadata import SessionLocal
from models.sensitive_data import SensitivityLevel, ProtectionStrategy, ResourceType
from utils.db_utils import handle_api_exceptions

sensitive_data_bp = Blueprint('sensitive_data', __name__)

@sensitive_data_bp.route('/resources', methods=['GET'])
@handle_api_exceptions
def get_resources():
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        database_id = request.args.get('databaseId')
        resources = service.get_resources(database_id)
        return jsonify([r.to_dict() for r in resources])
    finally:
        session.close()

@sensitive_data_bp.route('/resources', methods=['POST'])
@handle_api_exceptions
def create_resource():
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        data = request.json
        resource = service.create_resource(
            resource_type=ResourceType(data['resource_type']),
            resource_name=data['resource_name'],
            sensitivity_level=SensitivityLevel(data.get('sensitivity_level', 'INTERNAL')),
            database_id=data['database_id'],
            owner=data.get('owner'),
            description=data.get('description')
        )
        return jsonify(resource.to_dict()), 201
    finally:
        session.close()

@sensitive_data_bp.route('/resources/<resource_id>', methods=['PATCH'])
@handle_api_exceptions
def update_resource(resource_id):
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        data = request.json
        resource = service.update_resource(resource_id, **data)
        if not resource:
            return jsonify({'error': 'Resource not found'}), 404
        return jsonify(resource.to_dict())
    finally:
        session.close()

@sensitive_data_bp.route('/resources/<resource_id>', methods=['DELETE'])
@handle_api_exceptions
def delete_resource(resource_id):
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        success = service.delete_resource(resource_id)
        if not success:
            return jsonify({'error': 'Resource not found'}), 404
        return jsonify({'status': 'deleted'})
    finally:
        session.close()

@sensitive_data_bp.route('/policies', methods=['GET'])
@handle_api_exceptions
def get_policies():
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        resource_id = request.args.get('resourceId')
        policies = service.get_policies(resource_id)
        return jsonify([p.to_dict() for p in policies])
    finally:
        session.close()

@sensitive_data_bp.route('/policies', methods=['POST'])
@handle_api_exceptions
def create_policy():
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        data = request.json
        policy = service.create_policy(
            resource_id=data['resource_id'],
            privilege_type=data['privilege_type'],
            role_id=data['role_id'],
            protection_strategy=ProtectionStrategy(data['protection_strategy']),
            policy_expr=data.get('policy_expr')
        )
        return jsonify(policy.to_dict()), 201
    finally:
        session.close()

@sensitive_data_bp.route('/policies/<policy_id>', methods=['PATCH'])
@handle_api_exceptions
def update_policy(policy_id):
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        data = request.json
        policy = service.update_policy(policy_id, **data)
        if not policy:
            return jsonify({'error': 'Policy not found'}), 404
        return jsonify(policy.to_dict())
    finally:
        session.close()

@sensitive_data_bp.route('/policies/<policy_id>', methods=['DELETE'])
@handle_api_exceptions
def delete_policy(policy_id):
    session = SessionLocal()
    service = SensitiveDataService(session)
    try:
        success = service.delete_policy(policy_id)
        if not success:
            return jsonify({'error': 'Policy not found'}), 404
        return jsonify({'status': 'deleted'})
    finally:
        session.close()
