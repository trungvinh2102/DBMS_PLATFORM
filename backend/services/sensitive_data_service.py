"""
sensitive_data_service.py

Service layer for managing sensitive resources and policies.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from models.sensitive_data import SensitiveResource, SensitivePolicy, SensitivityLevel, ProtectionStrategy, ResourceType
from utils.db_utils import with_session

class SensitiveDataService:
    def __init__(self, db: Session):
        self.db = db

    def get_resources(self, database_id: Optional[str] = None) -> List[SensitiveResource]:
        """Get all sensitive resources, optionally filtered by database."""
        query = self.db.query(SensitiveResource)
        if database_id:
            query = query.filter(SensitiveResource.database_id == database_id)
        return query.all()

    def get_resource_by_id(self, resource_id: str) -> Optional[SensitiveResource]:
        """Get a specific sensitive resource by ID."""
        return self.db.query(SensitiveResource).filter(SensitiveResource.id == resource_id).first()

    def create_resource(self, resource_type: ResourceType, resource_name: str, 
                        sensitivity_level: SensitivityLevel, database_id: str,
                        owner: Optional[str] = None, description: Optional[str] = None) -> SensitiveResource:
        """Create a new sensitive resource."""
        resource = SensitiveResource(
            resource_type=resource_type,
            resource_name=resource_name,
            sensitivity_level=sensitivity_level,
            database_id=database_id,
            owner=owner,
            description=description
        )
        self.db.add(resource)
        self.db.commit()
        self.db.refresh(resource)
        return resource

    def update_resource(self, resource_id: str, **kwargs) -> Optional[SensitiveResource]:
        """Update an existing sensitive resource."""
        resource = self.get_resource_by_id(resource_id)
        if not resource:
            return None
        
        for key, value in kwargs.items():
            if hasattr(resource, key):
                if key == 'resource_type' and isinstance(value, str):
                    value = ResourceType(value)
                elif key == 'sensitivity_level' and isinstance(value, str):
                    value = SensitivityLevel(value)
                setattr(resource, key, value)
        
        self.db.commit()
        self.db.refresh(resource)
        return resource

    def delete_resource(self, resource_id: str) -> bool:
        """Delete a sensitive resource."""
        resource = self.get_resource_by_id(resource_id)
        if not resource:
            return False
        
        self.db.delete(resource)
        self.db.commit()
        return True

    def get_policies(self, resource_id: Optional[str] = None) -> List[SensitivePolicy]:
        """Get all sensitive policies, optionally filtered by resource."""
        query = self.db.query(SensitivePolicy)
        if resource_id:
            query = query.filter(SensitivePolicy.resource_id == resource_id)
        return query.all()

    def get_policy_by_id(self, policy_id: str) -> Optional[SensitivePolicy]:
        """Get a specific sensitive policy by ID."""
        return self.db.query(SensitivePolicy).filter(SensitivePolicy.id == policy_id).first()

    def create_policy(self, resource_id: str, privilege_type: str, role_id: str,
                      protection_strategy: ProtectionStrategy, 
                      policy_expr: Optional[str] = None) -> SensitivePolicy:
        """Create a new sensitive policy."""
        policy = SensitivePolicy(
            resource_id=resource_id,
            privilege_type=privilege_type,
            role_id=role_id,
            protection_strategy=protection_strategy,
            policy_expr=policy_expr
        )
        self.db.add(policy)
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def update_policy(self, policy_id: str, **kwargs) -> Optional[SensitivePolicy]:
        """Update an existing sensitive policy."""
        policy = self.get_policy_by_id(policy_id)
        if not policy:
            return None
        
        for key, value in kwargs.items():
            if hasattr(policy, key):
                if key == 'protection_strategy' and isinstance(value, str):
                    value = ProtectionStrategy(value)
                setattr(policy, key, value)
        
        self.db.commit()
        self.db.refresh(policy)
        return policy

    def delete_policy(self, policy_id: str) -> bool:
        """Delete a sensitive policy."""
        policy = self.get_policy_by_id(policy_id)
        if not policy:
            return False
        
        self.db.delete(policy)
        self.db.commit()
        return True
