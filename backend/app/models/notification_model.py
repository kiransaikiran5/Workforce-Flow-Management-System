from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Index
)

from sqlalchemy.sql import func
from datetime import datetime, timezone
from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    # ======================================================
    # PRIMARY KEY
    # ======================================================

    id = Column(Integer, primary_key=True, index=True)

    # ======================================================
    # USER INFO
    # ======================================================

    user_email = Column(
        String,
        nullable=False,
        index=True
    )

    target_email = Column(
        String,
        nullable=True,
        index=True
    )

    # ======================================================
    # NOTIFICATION CONTENT
    # ======================================================

    message = Column(
        String,
        nullable=False
    )

    # ======================================================
    # TYPE
    # examples:
    # upload
    # employee_create
    # employee_update
    # leave
    # payroll
    # system
    # ======================================================

    type = Column(
        String,
        default="general",
        index=True
    )

    # ======================================================
    # CATEGORY
    # examples:
    # employee
    # task
    # payroll
    # leave
    # system
    # ======================================================

    category = Column(
        String,
        default="general",
        index=True
    )

    # ======================================================
    # PRIORITY
    # high / normal / low
    # ======================================================

    priority = Column(
        String,
        default="normal",
        index=True
    )

    # ======================================================
    # READ STATUS
    # ======================================================

    is_read = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )

    # ======================================================
    # TIMESTAMP
    # ======================================================

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ==========================================================
# PERFORMANCE INDEXES
# ==========================================================

Index(
    "idx_user_created",
    Notification.user_email,
    Notification.created_at
)

Index(
    "idx_type_created",
    Notification.type,
    Notification.created_at
)

Index(
    "idx_category_created",
    Notification.category,
    Notification.created_at
)