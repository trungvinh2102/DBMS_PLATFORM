"""
data_access_service.py

Service for managing Data Access Control resources, policies, and masking rules.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models.data_access_models import (
    DataResource, MaskingPolicy, DataAccessPolicy, SensitivityLevel, 
    MaskingType, PolicySubjectType, DataAccessAudit
)
from models.metadata import Role, User
import datetime
import uuid

class DataAccessService:
    def __init__(self, db_session: Session):
        self.db = db_session

    # --- Data Resources ---

    def create_data_resource(self, database_id: str, schema_name: str, table_name: str, 
                             resource_type: str, column_name: str = None, 
                             sensitivity: SensitivityLevel = SensitivityLevel.INTERNAL,
                             description: str = None, tags: Dict = None) -> DataResource:
        resource = DataResource(
            id=str(uuid.uuid4()),
            databaseId=database_id,
            schemaName=schema_name,
            tableName=table_name,
            columnName=column_name,
            resourceType=resource_type,
            sensitivity=sensitivity,
            description=description,
            tags=tags
        )
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)
        return resource

    def get_data_resources(self, database_id: str = None) -> List[DataResource]:
        query = self.db.query(DataResource)
        if database_id:
            query = query.filter(DataResource.databaseId == database_id)
        return query.all()

    def get_data_resource_by_id(self, resource_id: str) -> Optional[DataResource]:
        return self.db.query(DataResource).filter(DataResource.id == resource_id).first()

    def update_data_resource_sensitivity(self, resource_id: str, sensitivity: SensitivityLevel):
        resource = self.get_data_resource_by_id(resource_id)
        if resource:
            resource.sensitivity = sensitivity
            self.db.commit()
            self.db.refresh(resource)
        return resource

    # --- Masking Policies ---

    def create_masking_policy(self, name: str, masking_type: MaskingType, 
                              description: str = None, parameters: Dict = None, 
                              condition: Dict = None) -> MaskingPolicy:
        policy = MaskingPolicy(
            id=str(uuid.uuid4()),
            name=name,
            maskingType=masking_type,
            description=description,
            parameters=parameters,
            condition=condition
        )
        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def get_masking_policies(self) -> List[MaskingPolicy]:
        return self.db.query(MaskingPolicy).all()

    # --- Data Access Policies ---

    def create_access_policy(self, name: str, subject_type: PolicySubjectType, subject_id: str,
                             privilege_code: str, resource_id: str = None, 
                             masking_policy_id: str = None, environment_condition: str = None,
                             priority: int = 0) -> DataAccessPolicy:
        policy = DataAccessPolicy(
            id=str(uuid.uuid4()),
            name=name,
            subjectType=subject_type,
            subjectId=subject_id,
            privilegeCode=privilege_code,
            resourceId=resource_id,
            maskingPolicyId=masking_policy_id,
            environmentCondition=environment_condition,
            priority=priority
        )
        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def get_access_policies(self) -> List[DataAccessPolicy]:
        return self.db.query(DataAccessPolicy).all()

    # --- Policy Evaluation (Stub for now) ---
    
    def evaluate_access(self, user_id: str, resource_id: str, privilege_requested: str) -> Dict[str, Any]:
        """
        Simulates evaluating access for a user against a resource.
        Returns decision dict: { allowed: bool, masking: str, audit: str }
        """
        # 1. Fetch User and Roles
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"allowed": False, "reason": "User not found"}
        
        # 2. Find relevant policies for User OR their Roles
        # This is a simplified "allow if any policy allows" logic for now.
        # Real logic needs to handle Deny and Priority.
        
        # Mock decision
        return {
            "allowed": True, 
            "masking": "NONE", 
            "reason": "Default Open Policy (Mock)"
        }
