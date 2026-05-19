from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class AttritionPrediction(Base):
    __tablename__ = "attrition_predictions"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)  # link to existing employee
    identifier = Column(String, nullable=False)  # email or employee number from uploaded file
    risk_score = Column(Float, nullable=False)    # probability of attrition (0–1)
    risk_category = Column(String, nullable=False)  # High / Medium / Low
    features_json = Column(JSON, nullable=True)   # raw features used for prediction
    predicted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    uploaded_file = Column(String, nullable=True)

    # optional relationship
    employee = relationship("Employee", backref="predictions")