from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.db.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # who performed action
    performed_by = Column(String, nullable=False)

    # action type
    action = Column(String, nullable=False)
    # examples: CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE

    module = Column(String, nullable=True) 
    
    # target entity
    target = Column(String, nullable=True)
    # example: employee email or id

    # extra details
    details = Column(String, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
