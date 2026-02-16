import sys
import os
from dotenv import load_dotenv

# Load env before imports
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.metadata import SessionLocal, User
from models.notification import Notification, NotificationType
import uuid
import datetime

def test_notification():
    session = SessionLocal()
    try:
        # Get first user
        user = session.query(User).first()
        if not user:
            print("No users found!")
            return

        print(f"Testing with user: {user.username} ({user.id})")

        # Create notification
        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title="Test Notification",
            message="This is a test notification",
            type=NotificationType.INFO,
            created_at=datetime.datetime.utcnow(),
            is_read=False
        )
        session.add(notif)
        session.commit()
        print(f"Created notification: {notif.id}")

        # Fetch notifications
        fetched = session.query(Notification).filter(Notification.user_id == user.id).all()
        print(f"Found {len(fetched)} notifications for user.")
        
        for n in fetched:
            print(f"- {n.title}: {n.message} ({n.created_at})")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    test_notification()
