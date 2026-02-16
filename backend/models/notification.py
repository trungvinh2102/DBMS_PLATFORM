from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from .metadata import Base

class NotificationType(enum.Enum):
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    ERROR = "ERROR"

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum(NotificationType, name="NotificationType"), default=NotificationType.INFO)
    is_read = Column(Boolean, default=False)
    link = Column(String, nullable=True)  # Optional link to navigate to
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship to User
    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type.value,
            "is_read": self.is_read,
            "link": self.link,
            "created_at": self.created_at.isoformat()
        }
