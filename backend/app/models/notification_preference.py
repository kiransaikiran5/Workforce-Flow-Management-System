from sqlalchemy import Column, Integer, ForeignKey, Boolean
from app.db.database import Base

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    email_high_risk_alerts = Column(Boolean, default=True)   # receive email for high‑risk alerts
    email_weekly_summary = Column(Boolean, default=False)   # optional, for later