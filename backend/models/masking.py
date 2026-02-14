
"""
masking.py

SQLAlchemy models for Data Masking policies and configurations.
"""
import enum
import uuid
import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Enum as SqEnum
from sqlalchemy.orm import relationship
from models.metadata import Base

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())

class MaskingRuleType(enum.Enum):
    """
    Enum for supported masking types.
    PARTIAL: Show first/last N characters, mask the rest.
    FULL: Mask entirely (e.g. *****).
    HASH: Hash using SHA256.
    EMAIL: Mask email user part (e.g. u***@domain.com).
    REGEX: Replace regex pattern with a string.
    NULL: Return NULL.
    """
    PARTIAL = "PARTIAL"
    FULL = "FULL"
    HASH = "HASH"
    EMAIL = "EMAIL"
    REGEX = "REGEX"
    NULL = "NULL"

class MaskingPattern(Base):
    """
    Represents a reusable masking pattern configuration.
    """
    __tablename__ = "masking_patterns"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True) # e.g. "US Phone", "Standard Email"
    description = Column(Text, nullable=True)
    maskingType = Column(SqEnum(MaskingRuleType, name="masking_rule_type"), nullable=False)
    maskingArgs = Column(Text, nullable=True) # JSON args
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "maskingType": self.maskingType.value,
            "maskingArgs": self.maskingArgs,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "changed_on": self.changed_on.isoformat() if self.changed_on else None,
        }

class MaskingRule(Base):
    """
    Represents a data masking rule in the database.
    """
    __tablename__ = "masking_rules"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Target Resource: Defines WHERE to mask
    resourceSchema = Column(String, nullable=True, default="public")
    resourceTable = Column(String, nullable=False)
    resourceColumn = Column(String, nullable=False)

    # Condition: Defines WHO to mask for
    # If roleId is NULL, applying to all users? Or fallback?
    # Usually specific rules override generic ones.
    roleId = Column(String, ForeignKey("roles.id"), nullable=True)
    
    # Action: Defines HOW to mask
    maskingType = Column(SqEnum(MaskingRuleType, name="masking_rule_type"), nullable=False)
    
    # Configuration for the masking function
    # e.g. JSON: {"start": 2, "end": 2, "char": "*"} for PARTIAL
    maskingArgs = Column(Text, nullable=True) 

    isEnabled = Column(Boolean, default=True)
    priority = Column(Integer, default=0)

    # Relationships
    role = relationship("Role")

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        """Serialize model to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "resourceSchema": self.resourceSchema,
            "resourceTable": self.resourceTable,
            "resourceColumn": self.resourceColumn,
            "roleId": self.roleId,
            "roleName": self.role.name if self.role else None,
            "maskingType": self.maskingType.value,
            "maskingArgs": self.maskingArgs,
            "isEnabled": self.isEnabled,
            "priority": self.priority,
            "created_on": self.created_on.isoformat() if self.created_on else None,
            "changed_on": self.changed_on.isoformat() if self.changed_on else None,
        }
