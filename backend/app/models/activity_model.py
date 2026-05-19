from sqlalchemy import Column, Integer, String, DateTime, Index
from datetime import datetime, timezone

from app.db.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)
    module = Column(String, nullable=False)
    details = Column(String, nullable=True)

    # ✅ Timezone‑aware, auto‑sets on creation
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ip_address = Column(String, nullable=True)
    device = Column(String, nullable=True)

    __table_args__ = (
        Index("idx_activity_created", "created_at"),
        Index("idx_activity_user", "user_email"),
    )