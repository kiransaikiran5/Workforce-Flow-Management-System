from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from app.db.database import Base
from datetime import datetime, timezone

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type = Column(String, nullable=False)   # sick, casual, annual
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String, default="pending")    # pending, approved, rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))