from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class HighRiskAlert(Base):
    __tablename__ = "high_risk_alerts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    prediction_id = Column(Integer, ForeignKey("attrition_predictions.id"), nullable=True)
    alert_type = Column(String, nullable=False)   # "high_risk_detected", "risk_increased", "risk_decreased"
    message = Column(String, nullable=False)
    severity = Column(String, default="high")     # "high", "medium", "low"
    is_read = Column(Boolean, default=False)
    
    # ✅ New columns for smart alerts
    priority = Column(String, default="high")          # high, medium, low
    category = Column(String, nullable=True)           # risk_escalation, department_surge, persistent_high_risk
    acknowledged = Column(Boolean, default=False) 
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Optional relationships (if you want to load linked data easily)
    employee = relationship("Employee", backref="alerts")
    prediction = relationship("AttritionPrediction", backref="alerts")