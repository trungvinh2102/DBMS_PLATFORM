"""
sensitive_data.py

SQLAlchemy models for Sensitive Data management, including Resources and Policies
based on the Sensitive Data Model documentation.
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Enum as SqEnum
from sqlalchemy.orm import relationship
import enum
import datetime
import uuid
from .metadata import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class SensitivityLevel(enum.Enum):
    """
    Sensitivity levels from LEVEL 0 to LEVEL 5.
    """
    PUBLIC = "PUBLIC"           # LEVEL 0
    INTERNAL = "INTERNAL"       # LEVEL 1
    CONFIDENTIAL = "CONFIDENTIAL" # LEVEL 2
    SENSITIVE = "SENSITIVE"     # LEVEL 3
    PII = "PII"                 # LEVEL 4
    CRITICAL = "CRITICAL"       # LEVEL 5

class ProtectionStrategy(enum.Enum):
    """
    Protection strategies for sensitive data.
    """
    ENCRYPTION = "ENCRYPTION"
    TOKENIZATION = "TOKENIZATION"
    MASKING = "MASKING"
    HASHING = "HASHING"
    AGGREGATION = "AGGREGATION"
    REDACTION = "REDACTION"
    SYNTHETIC_DATA = "SYNTHETIC_DATA"
    ACCESS_DENY = "ACCESS_DENY"

class ResourceType(enum.Enum):
    """
    Types of sensitive resources.
    """
    TABLE = "TABLE"
    COLUMN = "COLUMN"
    DATASET = "DATASET"

class SensitiveResource(Base):
    """
    Represents a resource that contains sensitive data.
    """
    __tablename__ = "sensitive_resources"

    id = Column(String, primary_key=True, default=generate_uuid)
    resource_type = Column(SqEnum(ResourceType, name="sensitive_resource_type"), nullable=False)
    resource_name = Column(String, nullable=False) # e.g. "public.users.email"
    sensitivity_level = Column(SqEnum(SensitivityLevel, name="sensitivity_level"), default=SensitivityLevel.INTERNAL)
    owner = Column(String, nullable=True)
    
    # Extended fields for practical use
    database_id = Column(String, ForeignKey("databases.id"), nullable=False)
    description = Column(Text, nullable=True)

    policies = relationship("SensitivePolicy", back_populates="resource", cascade="all, delete-orphan")

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "resource_type": self.resource_type.value,
            "resource_name": self.resource_name,
            "sensitivity_level": self.sensitivity_level.value,
            "owner": self.owner,
            "database_id": self.database_id,
            "description": self.description,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "changed_on": self.changed_on.isoformat() if self.changed_on else None,
        }

class SensitivePolicy(Base):
    """
    Policy defining access and protection for sensitive resources.
    """
    __tablename__ = "sensitive_policies"

    id = Column(String, primary_key=True, default=generate_uuid)
    resource_id = Column(String, ForeignKey("sensitive_resources.id", ondelete="CASCADE"), nullable=False)
    privilege_type = Column(String, nullable=False) # e.g. "VIEW_SENSITIVE", "UNMASK"
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    policy_expr = Column(Text, nullable=True) # SQL-like condition or JSON logic
    protection_strategy = Column(SqEnum(ProtectionStrategy, name="protection_strategy"), nullable=False)

    resource = relationship("SensitiveResource", back_populates="policies")
    role = relationship("Role")

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "resource_id": self.resource_id,
            "privilege_type": self.privilege_type,
            "role_id": self.role_id,
            "role_name": self.role.name if self.role else None,
            "policy_expr": self.policy_expr,
            "protection_strategy": self.protection_strategy.value,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "changed_on": self.changed_on.isoformat() if self.changed_on else None,
        }
