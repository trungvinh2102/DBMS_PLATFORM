
"""
access_request_service.py

Service for managing access requests.
"""

import uuid
import datetime
from sqlalchemy.orm import joinedload
from models.metadata import AccessRequest, RequestStatus, UserRole, User, Role
from models.notification import Notification, NotificationType
from utils.db_utils import with_session

class AccessRequestService:
    @with_session
    def create_request(self, session, user_id, role_id, reason, valid_from=None, valid_until=None):
        """Create a new access request."""
        # Check if user already has a pending request for this role
        existing = session.query(AccessRequest).filter(
            AccessRequest.userId == user_id,
            AccessRequest.roleId == role_id,
            AccessRequest.status == RequestStatus.PENDING
        ).first()
        
        if existing:
            raise Exception("You already have a pending request for this role.")

        new_req = AccessRequest(
            id=str(uuid.uuid4()),
            userId=user_id,
            roleId=role_id,
            status=RequestStatus.PENDING,
            requestReason=reason,
            valid_from=valid_from,
            valid_until=valid_until
        )
        session.add(new_req)
        session.flush() # Ensure new_req has all loaded attributes if needed (though we just committed below)
        
        # Notify Admins
        try:
            admin_role = session.query(Role).filter(Role.name == "Admin").first()
            if admin_role:
                admins = session.query(User).filter(User.roleId == admin_role.id).all()
                for admin in admins:
                    notif = Notification(
                        id=str(uuid.uuid4()),
                        user_id=admin.id,
                        title="New Access Request",
                        message=f"User {new_req.user.username if new_req.user else user_id} requested role {new_req.role.name if new_req.role else role_id}.",
                        type=NotificationType.INFO,
                        created_at=datetime.datetime.utcnow(),
                        is_read=False
                    )
                    session.add(notif)
                    # Emit socket to individual admin
                    from extensions import socketio
                    socketio.emit(f'notification_{admin.id}', notif.to_dict())
        except Exception as e:
            print(f"Admin notification error: {e}")

        session.commit()
        
        # Refresh to get relations for serialization
        session.refresh(new_req)
        
        # Emit general socket event for the access requests tab
        try:
            from extensions import socketio
            socketio.emit('access_request_created', self._serialize_request(new_req))
        except Exception as e:
            print(f"Socket emit error: {e}")
            
        return self._serialize_request(new_req)

    @with_session
    def list_requests(self, session, user_id=None, status=None):
        """List access requests."""
        query = session.query(AccessRequest).options(
            joinedload(AccessRequest.user),
            joinedload(AccessRequest.role)
        )
        
        if user_id:
            query = query.filter(AccessRequest.userId == user_id)
        if status:
            if isinstance(status, str):
                status = RequestStatus(status)
            query = query.filter(AccessRequest.status == status)
            
        requests = query.order_by(AccessRequest.created_on.desc()).all()
        return [self._serialize_request(req) for req in requests]

    @with_session
    def approve_request(self, session, request_id, reviewer_id):
        """Approve a request and grant the role."""
        req = session.query(AccessRequest).options(
            joinedload(AccessRequest.user),
            joinedload(AccessRequest.role)
        ).filter(AccessRequest.id == request_id).first()
        
        if not req:
            raise Exception("Request not found")
        
        if req.status != RequestStatus.PENDING:
            raise Exception("Request is not pending")

        # Update Request Status
        req.status = RequestStatus.APPROVED
        req.reviewerId = reviewer_id
        req.reviewedAt = datetime.datetime.utcnow()
        
        # Grant Role
        # Check if user already has this role
        user_role = session.query(UserRole).filter(
            UserRole.userId == req.userId,
            UserRole.roleId == req.roleId
        ).first()

        if user_role:
            # Update validity if it exists
            user_role.valid_from = req.valid_from
            user_role.valid_until = req.valid_until
        else:
            # Create new association
            new_role = UserRole(
                userId=req.userId,
                roleId=req.roleId,
                valid_from=req.valid_from,
                valid_until=req.valid_until,
                created_on=datetime.datetime.utcnow()
            )
            session.add(new_role)
            
        # Create Notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=req.userId,
            title="Access Request Approved",
            message=f"Your request for role '{req.role.name}' has been approved.",
            type=NotificationType.SUCCESS,
            created_at=datetime.datetime.utcnow(),
            is_read=False
        )
        session.add(notification)

        session.commit()
        
        # Emit socket event
        try:
            from extensions import socketio
            socketio.emit(f'notification_{req.userId}', notification.to_dict())
            # Emit general update event
            socketio.emit('access_request_updated', self._serialize_request(req))
        except Exception as e:
            print(f"Socket emit error: {e}")

        return self._serialize_request(req)

    @with_session
    def reject_request(self, session, request_id, reviewer_id, reason):
        """Reject a request."""
        req = session.query(AccessRequest).options(
            joinedload(AccessRequest.user),
            joinedload(AccessRequest.role)
        ).filter(AccessRequest.id == request_id).first()
        
        if not req:
            raise Exception("Request not found")
            
        if req.status != RequestStatus.PENDING:
            raise Exception("Request is not pending")

        req.status = RequestStatus.REJECTED
        req.reviewerId = reviewer_id
        req.reviewedAt = datetime.datetime.utcnow()
        req.rejectionReason = reason
        
        
        # Create Notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=req.userId,
            title="Access Request Rejected",
            message=f"Your request for role '{req.role.name}' has been rejected. Reason: {reason}",
            type=NotificationType.ERROR,
            created_at=datetime.datetime.utcnow(),
            is_read=False
        )
        session.add(notification)

        session.commit()
        
        # Emit socket event
        try:
            from extensions import socketio
            socketio.emit(f'notification_{req.userId}', notification.to_dict())
            # Emit general update event
            socketio.emit('access_request_updated', self._serialize_request(req))
        except Exception as e:
            print(f"Socket emit error: {e}")

        return self._serialize_request(req)

    @with_session
    def total_pending_count(self, session):
        """Get the total number of pending requests."""
        count = session.query(AccessRequest).filter(AccessRequest.status == RequestStatus.PENDING).count()
        return {"count": count}

    def _serialize_request(self, req):
        return {
            "id": req.id,
            "userId": req.userId,
            "username": req.user.username if req.user else None,
            "fullName": req.user.name if req.user else None,
            "userEmail": req.user.email if req.user else None,
            "roleId": req.roleId,
            "roleName": req.role.name if req.role else None,
            "roleDescription": req.role.description if req.role else None,
            "status": req.status.value,
            "requestReason": req.requestReason,
            "valid_from": req.valid_from.isoformat() + "Z" if req.valid_from else None,
            "valid_until": req.valid_until.isoformat() + "Z" if req.valid_until else None,
            "reviewerId": req.reviewerId,
            "reviewedAt": req.reviewedAt.isoformat() + "Z" if req.reviewedAt else None,
            "rejectionReason": req.rejectionReason,
            "created_on": req.created_on.isoformat() + "Z" if req.created_on else None,
        }

access_request_service = AccessRequestService()
