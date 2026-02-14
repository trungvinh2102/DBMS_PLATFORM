"""
masking.py

API Endpoints for managing masking policies and previewing query rewrite effects.
"""
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from models.masking import MaskingRule, MaskingPattern, MaskingRuleType
from services.masking_service import MaskingService
from models.metadata import get_db, SessionLocal, Role


masking_bp = Blueprint('masking', __name__)

def get_session():
    """Helper to get database session."""
    return SessionLocal()

@masking_bp.route('/policies', methods=['GET'])
def list_policies():
    """List all masking policies."""
    db = get_session()
    try:
        policies = db.query(MaskingRule).order_by(MaskingRule.priority.desc()).all()
        return jsonify([p.to_dict() for p in policies])
    finally:
        db.close()

@masking_bp.route('/policies', methods=['POST'])
def create_policy():
    """Create a new masking policy."""
    data = request.json
    db = get_session()
    try:
        # Simple validation
        if not data.get('name') or not data.get('resourceTable') or not data.get('resourceColumn') or not data.get('maskingType'):
            return jsonify({"error": "Missing required fields"}), 400

        try:
            mask_type = MaskingRuleType(data['maskingType'])
        except ValueError:
            return jsonify({"error": f"Invalid maskingType. Valid types: {[e.name for e in MaskingRuleType]}"}), 400

        policy = MaskingRule(
            name=data['name'],
            description=data.get('description'),
            resourceSchema=data.get('resourceSchema', 'public'),
            resourceTable=data['resourceTable'],
            resourceColumn=data['resourceColumn'],
            roleId=data.get('roleId'), # Can be None for global rules
            maskingType=mask_type,
            maskingArgs=data.get('maskingArgs'), # Expecting JSON string for args
            isEnabled=data.get('isEnabled', True),
            priority=data.get('priority', 0)
        )
        
        db.add(policy)
        db.commit()
        db.refresh(policy)
        return jsonify(policy.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@masking_bp.route('/policies/<policy_id>', methods=['PUT'])
def update_policy(policy_id):
    """Update an existing policy."""
    data = request.json
    db = get_session()
    try:
        policy = db.query(MaskingRule).filter(MaskingRule.id == policy_id).first()
        
        if not policy:
            return jsonify({"error": "Policy not found"}), 404

        if 'name' in data: policy.name = data['name']
        if 'description' in data: policy.description = data['description']
        if 'resourceTable' in data: policy.resourceTable = data['resourceTable']
        if 'resourceColumn' in data: policy.resourceColumn = data['resourceColumn']
        if 'resourceSchema' in data: policy.resourceSchema = data['resourceSchema']
        if 'roleId' in data: policy.roleId = data['roleId']
        if 'maskingType' in data: 
            try:
                policy.maskingType = MaskingRuleType(data['maskingType'])
            except ValueError:
                return jsonify({"error": "Invalid maskingType"}), 400
        if 'maskingArgs' in data: policy.maskingArgs = data['maskingArgs']
        if 'isEnabled' in data: policy.isEnabled = data['isEnabled']
        if 'priority' in data: policy.priority = data['priority']

        db.commit()
        db.refresh(policy)
        return jsonify(policy.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@masking_bp.route('/policies/<policy_id>', methods=['DELETE'])
def delete_policy(policy_id):
    """Delete a policy."""
    db = get_session()
    try:
        policy = db.query(MaskingRule).filter(MaskingRule.id == policy_id).first()
        if not policy:
            return jsonify({"error": "Policy not found"}), 404
            
        db.delete(policy)
        db.commit()
        return jsonify({"message": "Policy deleted"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@masking_bp.route('/preview/sql', methods=['POST'])
def preview_rewrite():
    """
    Preview how an SQL query would be rewritten given a role context.
    Expects JSON: { "sql": "SELECT ...", "roleId": "..." }
    """
    data = request.json
    sql = data.get('sql')
    role_id = data.get('roleId')
    
    if not sql:
        return jsonify({"error": "SQL is required"}), 400
        
    db = get_session()
    try:
        # Get active policies for this role
        # If roleId is empty/null, we pass empty list to get only global rules
        roles = [role_id] if role_id else []
        policies = MaskingService.get_policies_for_user(db, roles)
        
        rewritten_sql = MaskingService.apply_masking(sql, policies)
        
        return jsonify({
            "originalSQL": sql,
            "rewrittenSQL": rewritten_sql,
            "appliedPolicies": [p.name for p in policies]
        })
    finally:
        db.close()
@masking_bp.route('/patterns', methods=['GET'])
def list_patterns():
    """List all masking patterns."""
    db = get_session()
    try:
        patterns = db.query(MaskingPattern).order_by(MaskingPattern.name).all()
        return jsonify([p.to_dict() for p in patterns])
    finally:
        db.close()

@masking_bp.route('/patterns', methods=['POST'])
def create_pattern():
    """Create a new masking pattern."""
    data = request.json
    db = get_session()
    try:
        if not data.get('name') or not data.get('maskingType'):
            return jsonify({"error": "Missing required fields"}), 400

        try:
            mask_type = MaskingRuleType(data['maskingType'])
        except ValueError:
            return jsonify({"error": "Invalid maskingType"}), 400

        pattern = MaskingPattern(
            name=data['name'],
            description=data.get('description'),
            maskingType=mask_type,
            maskingArgs=data.get('maskingArgs')
        )
        
        db.add(pattern)
        db.commit()
        db.refresh(pattern)
        return jsonify(pattern.to_dict()), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@masking_bp.route('/patterns/<pattern_id>', methods=['PUT'])
def update_pattern(pattern_id):
    """Update a masking pattern."""
    data = request.json
    db = get_session()
    try:
        pattern = db.query(MaskingPattern).filter(MaskingPattern.id == pattern_id).first()
        if not pattern:
            return jsonify({"error": "Pattern not found"}), 404

        if 'name' in data: pattern.name = data['name']
        if 'description' in data: pattern.description = data['description']
        if 'maskingType' in data:
            try:
                pattern.maskingType = MaskingRuleType(data['maskingType'])
            except ValueError:
                return jsonify({"error": "Invalid maskingType"}), 400
        if 'maskingArgs' in data: pattern.maskingArgs = data['maskingArgs']

        db.commit()
        db.refresh(pattern)
        return jsonify(pattern.to_dict())
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@masking_bp.route('/patterns/<pattern_id>', methods=['DELETE'])
def delete_pattern(pattern_id):
    """Delete a masking pattern."""
    db = get_session()
    try:
        pattern = db.query(MaskingPattern).filter(MaskingPattern.id == pattern_id).first()
        if not pattern:
            return jsonify({"error": "Pattern not found"}), 404
        
        db.delete(pattern)
        db.commit()
        return jsonify({"message": "Pattern deleted"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
