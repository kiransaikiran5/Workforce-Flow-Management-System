from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://postgres:1234@localhost:5432/work1_db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()

from app.models.attrition_prediction import AttritionPrediction  # add with other imports
from app.models.dataset_upload import DatasetUpload
from app.models.failed_record import FailedRecord
from app.models.high_risk_alert import HighRiskAlert
from app.models.risk_change_log import RiskChangeLog
from app.models.notification_preference import NotificationPreference
from app.models.email_log import EmailLog
from app.models.hr_intervention import HRIntervention
from app.models.employee_feedback import EmployeeFeedback


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
