from models.notification import Notification, NotificationType
from sqlalchemy.orm import Session
import uuid
import datetime
from utils.db_utils import with_session

class NotificationService:
    
    @staticmethod
    @with_session
    def get_notifications(session: Session, user_id: str, limit: int = 20, offset: int = 0):
        """
        Get all notifications for a user, ordered by created_at desc.
        """
        notifications = session.query(Notification)\
            .filter(Notification.user_id == user_id)\
            .order_by(Notification.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
        return [n.to_dict() for n in notifications]

    @staticmethod
    @with_session
    def get_unread_count(session: Session, user_id: str):
        """
        Get count of unread notifications.
        """
        count = session.query(Notification)\
            .filter(Notification.user_id == user_id, Notification.is_read == False)\
            .count()
        return count
            
    @staticmethod
    @with_session
    def create_notification(session: Session, user_id: str, title: str, message: str, type: NotificationType = NotificationType.INFO, link: str = None):
        """
        Create a new notification.
        """
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            link=link,
            created_at=datetime.datetime.utcnow(),
            is_read=False
        )
        session.add(notification)
        session.commit()
        
        # Emit socket event
        try:
            from extensions import socketio
            socketio.emit(f'notification_{user_id}', notification.to_dict())
        except Exception as e:
            print(f"Socket emit error: {e}")

        return notification.to_dict()

    @staticmethod
    @with_session
    def mark_as_read(session: Session, notification_id: str, user_id: str):
        """
        Mark a notification as read.
        """
        notification = session.query(Notification)\
            .filter(Notification.id == notification_id, Notification.user_id == user_id)\
            .first()
            
        if notification:
            notification.is_read = True
            session.commit()
            return True
        return False

    @staticmethod
    @with_session
    def mark_all_as_read(session: Session, user_id: str):
        """
        Mark all notifications for a user as read.
        """
        session.query(Notification)\
            .filter(Notification.user_id == user_id, Notification.is_read == False)\
            .update({Notification.is_read: True}, synchronize_session=False)
        session.commit()
        return True

notification_service = NotificationService()
