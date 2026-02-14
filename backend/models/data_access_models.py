"""
data_access_models.py

SQLAlchemy models for the Data Access Layer, including Resources, Policies, Masking, and Audits.
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from .metadata import Base

class SensitivityLevel(enum.Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    PII = "PII"
    CRITICAL = "CRITICAL"

class MaskingType(enum.Enum):
    NONE = "NONE"
    REDACT = "REDACT"      # *****
    PARTIAL = "PARTIAL"    # XXX-XXX-1234
    HASH = "HASH"          # SHA256
    NULLIFY = "NULLIFY"    # NULL
    SHUFFLE = "SHUFFLE"    # Random permutation
    CUSTOM = "CUSTOM"      # Custom SQL expression

class PolicySubjectType(enum.Enum):
    USER = "USER"
    ROLE = "ROLE"
    GROUP = "GROUP"
    SERVICE_ACCOUNT = "SERVICE_ACCOUNT"

class DataResource(Base):
    """
    Metadata about data resources (Tables, Columns, Views) to attach security attributes.
    """
    __tablename__ = 'data_resources'

    id = Column(String, primary_key=True)
    databaseId = Column(String, ForeignKey('databases.id'), nullable=False)
    schemaName = Column(String, nullable=False)
    tableName = Column(String, nullable=False)
    columnName = Column(String, nullable=True) # If null, applies to the whole table
    
    resourceType = Column(String, nullable=False) # TABLE, COLUMN, VIEW
    sensitivity = Column(Enum(SensitivityLevel, name="SensitivityLevel"), default=SensitivityLevel.INTERNAL)
    
    tags = Column(JSON, nullable=True) # flexible tags
    description = Column(Text, nullable=True)

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class MaskingPolicy(Base):
    """
    Defines how data should be masked.
    """
    __tablename__ = 'masking_policies'

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    maskingType = Column(Enum(MaskingType, name="MaskingType"), nullable=False)
    # For PARTIAL/CUSTOM types, e.g. "show_last=4" or "SHA256(col)"
    parameters = Column(JSON, nullable=True) 
    
    # Condition when this masking applies (optional generic condition)
    # e.g. {"role": "ANALYST"}
    condition = Column(JSON, nullable=True)

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class DataAccessPolicy(Base):
    """
    Fine-grained access control policy (ABAC/RBAC).
    """
    __tablename__ = 'data_access_policies'

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # WHO
    subjectType = Column(Enum(PolicySubjectType, name="PolicySubjectType"), nullable=False)
    subjectId = Column(String, nullable=False) # ID of User, Role, etc.

    # WHAT
    privilegeCode = Column(String, nullable=False) # READ_RAW, READ_MASKED, etc.
    
    # WHICH
    resourceId = Column(String, ForeignKey('data_resources.id'), nullable=True)
    
    # HOW (Masking reference)
    maskingPolicyId = Column(String, ForeignKey('masking_policies.id'), nullable=True)
    
    # WHEN/WHY (Conditions)
    # SQL-like expression or JSON logic: "time.hour > 9 AND time.hour < 17"
    environmentCondition = Column(Text, nullable=True) 
    
    isActive = Column(Boolean, default=True)
    priority = Column(Integer, default=0) # Strategy for conflict resolution

    resource = relationship("DataResource")
    maskingPolicy = relationship("MaskingPolicy")

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class DataAccessAudit(Base):
    """
    Detailed audit log for every data access decision.
    """
    __tablename__ = 'data_access_audits'

    id = Column(String, primary_key=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    userId = Column(String, nullable=True) # User who made the request
    username = Column(String, nullable=True)
    
    action = Column(String, nullable=False) # EXECUTE_QUERY, VIEW_METADATA
    resourceName = Column(String, nullable=True)
    
    # Decision details
    allowed = Column(Boolean, nullable=False)
    policyId = Column(String, ForeignKey('data_access_policies.id'), nullable=True)
    blockReason = Column(Text, nullable=True)
    
    # Query details
    originalQuery = Column(Text, nullable=True)
    rewrittenQuery = Column(Text, nullable=True)
    
    # Context
    clientIp = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    executionTimeMs = Column(Integer, nullable=True)
