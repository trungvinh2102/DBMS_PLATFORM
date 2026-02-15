"""
policy_exception_service.py

Service for managing Policy Exceptions.
"""
import uuid
import datetime
import logging
from sqlalchemy.orm import Session
from models import PolicyException, ExceptionAudit, ExceptionStatus, ExceptionRiskLevel
from utils.db_utils import with_session

logger = logging.getLogger(__name__)

class PolicyExceptionService:
    """Service for CRUD and lifecycle management of Policy Exceptions."""

    @with_session
    def list_exceptions(self, session: Session, status=None, subject_id=None):
        """List all policy exceptions, optionally filtered."""
        query = session.query(PolicyException)
        if status:
            query = query.filter(PolicyException.status == ExceptionStatus(status))
        if subject_id:
            query = query.filter(PolicyException.subjectId == subject_id)
        
        exceptions = query.order_by(PolicyException.created_on.desc()).all()
        return [self._serialize_exception(e) for e in exceptions]

    @with_session
    def get_exception(self, session: Session, exception_id: str):
        """Get a single exception by ID."""
        e = session.query(PolicyException).filter(PolicyException.id == exception_id).first()
        if not e:
            return None
        return self._serialize_exception(e)

    @with_session
    def create_exception(self, session: Session, data: dict, user_id: str):
        """Request a new policy exception."""
        logger.info(f"Creating exception: data={data}, user_id={user_id}")
        exception_id = f"EXC-{uuid.uuid4().hex[:8].upper()}"
        
        # Parse dates robustly for Python 3.7+
        def parse_date(d):
            if not d: return None
            d = d.replace('Z', '+00:00')
            try:
                return datetime.datetime.fromisoformat(d)
            except:
                # Truncate fractional seconds for older fromisoformat
                if '.' in d:
                    d = d.split('.')[0] + d[d.find('+'):] if '+' in d else d.split('.')[0]
                return datetime.datetime.fromisoformat(d)

        start_time = parse_date(data.get('startTime'))
        end_time = parse_date(data.get('endTime'))

        new_exception = PolicyException(
            id=exception_id,
            subjectType=data.get('subjectType', 'USER'),
            subjectId=data.get('subjectId', user_id),
            resourceId=data.get('resourceId'),
            overridePrivilege=data.get('overridePrivilege'),
            scope=data.get('scope', 'TABLE'),
            purpose=data.get('purpose'),
            startTime=start_time,
            endTime=end_time,
            riskLevel=ExceptionRiskLevel(data.get('riskLevel', 'LOW').upper()),
            status=ExceptionStatus(data.get('status', 'PENDING').upper())
        )
        session.add(new_exception)
        
        # Audit
        audit = ExceptionAudit(
            id=str(uuid.uuid4()),
            exceptionId=exception_id,
            userId=user_id,
            action="REQUEST",
            context=f"Requested for purpose: {new_exception.purpose}"
        )
        session.add(audit)
        
        session.commit()
        return self._serialize_exception(new_exception)

    @with_session
    def approve_exception(self, session: Session, exception_id: str, admin_id: str):
        """Approve a pending exception."""
        exception = session.query(PolicyException).filter(PolicyException.id == exception_id).first()
        if not exception:
            raise Exception("Exception not found")
        
        if exception.status != ExceptionStatus.PENDING:
            raise Exception(f"Cannot approve exception in {exception.status.value} status")

        exception.status = ExceptionStatus.APPROVED
        exception.approvedBy = admin_id
        
        # Audit
        audit = ExceptionAudit(
            id=str(uuid.uuid4()),
            exceptionId=exception_id,
            userId=admin_id,
            action="APPROVE"
        )
        session.add(audit)
        
        session.commit()
        return self._serialize_exception(exception)

    @with_session
    def reject_exception(self, session: Session, exception_id: str, admin_id: str, reason: str = None):
        """Reject a pending exception."""
        exception = session.query(PolicyException).filter(PolicyException.id == exception_id).first()
        if not exception:
            raise Exception("Exception not found")
        
        if exception.status != ExceptionStatus.PENDING:
            raise Exception(f"Cannot reject exception in {exception.status.value} status")

        exception.status = ExceptionStatus.REJECTED
        
        # Audit
        audit = ExceptionAudit(
            id=str(uuid.uuid4()),
            exceptionId=exception_id,
            userId=admin_id,
            action="REJECT",
            context=reason
        )
        session.add(audit)
        
        session.commit()
        return self._serialize_exception(exception)

    @with_session
    def revoke_exception(self, session: Session, exception_id: str, user_id: str):
        """Revoke an approved exception."""
        exception = session.query(PolicyException).filter(PolicyException.id == exception_id).first()
        if not exception:
            raise Exception("Exception not found")
        
        exception.status = ExceptionStatus.REVOKED
        
        # Audit
        audit = ExceptionAudit(
            id=str(uuid.uuid4()),
            exceptionId=exception_id,
            userId=user_id,
            action="REVOKE"
        )
        session.add(audit)
        
        session.commit()
        return self._serialize_exception(exception)

    def _serialize_exception(self, e: PolicyException):
        return {
            "id": e.id,
            "subjectType": e.subjectType,
            "subjectId": e.subjectId,
            "resourceId": e.resourceId,
            "overridePrivilege": e.overridePrivilege,
            "scope": e.scope,
            "purpose": e.purpose,
            "startTime": e.startTime.isoformat() if e.startTime else None,
            "endTime": e.endTime.isoformat() if e.endTime else None,
            "approvedBy": e.approvedBy,
            "riskLevel": e.riskLevel.value if e.riskLevel else None,
            "status": e.status.value if e.status else None,
            "createdOn": e.created_on.isoformat() if e.created_on else None,
            "changedOn": e.changed_on.isoformat() if e.changed_on else None
        }

policy_exception_service = PolicyExceptionService()
