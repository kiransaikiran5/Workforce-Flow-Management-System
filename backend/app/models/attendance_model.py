from sqlalchemy import (
    Column,
    Integer,
    Date,
    DateTime,
    ForeignKey,
    String,
    Float,
    Boolean,
)

from datetime import datetime, date, timezone
from sqlalchemy.orm import relationship
from app.db.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    # ==========================================
    # PRIMARY KEY
    # ==========================================
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ==========================================
    # EMPLOYEE RELATION
    # ==========================================
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    # ==========================================
    # ATTENDANCE DATE
    # ==========================================
    date = Column(
        Date,
        default=date.today
    )

    # ==========================================
    # STATUS
    # present
    # absent
    # leave
    # ==========================================
    status = Column(
        String,
        default="present"
    )

    # ==========================================
    # DAY STATUS
    # full_day
    # half_day
    # short_hours
    # leave
    # ==========================================
    day_status = Column(
        String,
        default="full_day"
    )

    # ==========================================
    # CHECK IN / OUT
    # ==========================================
    check_in = Column(DateTime(timezone=True))
    check_out = Column(DateTime(timezone=True))


    # ==========================================
    # WORK HOURS
    # ==========================================
    work_hours = Column(
        Float,
        default=0
    )

    # ==========================================
    # OVERTIME
    # ==========================================
    overtime_hours = Column(
        Float,
        default=0
    )

    # ==========================================
    # LATE MARK
    # ==========================================
    is_late = Column(
        Boolean,
        default=False
    )

    # ==========================================
    # LEAVE REASON
    # ==========================================
    leave_reason = Column(
        String,
        nullable=True
    )

    # ==========================================
    # MANAGER / ADMIN REMARKS
    # ==========================================
    remarks = Column(
        String,
        nullable=True
    )

    # ==========================================
    # TRACKING
    # ==========================================
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="attendance_records")
