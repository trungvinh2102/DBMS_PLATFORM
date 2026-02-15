"""
policy_exception.py

SQLAlchemy models for Policy Exceptions and Audits.
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from .metadata import Base

class ExceptionRiskLevel(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ExceptionStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"

class PolicyException(Base):
    """
    Policy Exception model for temporary/special access overrides.
    """
    __tablename__ = 'policy_exceptions'

    id = Column(String, primary_key=True)
    subjectType = Column(String, nullable=False)  # USER | ROLE
    subjectId = Column(String, nullable=False)
    resourceId = Column(String, ForeignKey('data_resources.id'), nullable=True)
    overridePrivilege = Column(String, nullable=False)  # e.g., READ_RAW, UNMASK
    scope = Column(String, nullable=False)  # TABLE | COLUMN | DATASET
    purpose = Column(Text, nullable=False)
    
    startTime = Column(DateTime, nullable=False)
    endTime = Column(DateTime, nullable=False)
    
    approvedBy = Column(String, nullable=True)  # User ID who approved
    riskLevel = Column(Enum(ExceptionRiskLevel, name="ExceptionRiskLevel"), default=ExceptionRiskLevel.LOW)
    status = Column(Enum(ExceptionStatus, name="ExceptionStatus"), default=ExceptionStatus.PENDING)

    resource = relationship("DataResource")

    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ExceptionAudit(Base):
    """
    Audit log for actions taken on Policy Exceptions.
    """
    __tablename__ = 'exception_audits'

    id = Column(String, primary_key=True)
    exceptionId = Column(String, ForeignKey('policy_exceptions.id'), nullable=False)
    userId = Column(String, nullable=False)  # User who performed the action
    action = Column(String, nullable=False)  # REQUEST, APPROVE, REJECT, REVOKE, ACCESS_BYPASS
    
    resource = Column(String, nullable=True)  # Path to resource accessed
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    context = Column(Text, nullable=True)  # JSON or additional details
    
    exception = relationship("PolicyException")
