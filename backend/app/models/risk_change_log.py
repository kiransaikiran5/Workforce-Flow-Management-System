from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from datetime import datetime, timezone
from app.db.database import Base

class RiskChangeLog(Base):
    __tablename__ = "risk_change_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    previous_risk_score = Column(Float, nullable=True)   # None if first prediction
    new_risk_score = Column(Float, nullable=False)
    previous_category = Column(String, nullable=True)    # None if first prediction
    new_category = Column(String, nullable=False)
    change_type = Column(String, nullable=False)         # "new_prediction", "category_changed", "score_updated"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))