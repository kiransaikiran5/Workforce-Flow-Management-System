from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime, timezone
from app.db.database import Base

class FailedRecord(Base):
    __tablename__ = "failed_records"

    id = Column(Integer, primary_key=True, index=True)
    dataset_upload_id = Column(Integer, ForeignKey("dataset_uploads.id"), nullable=True)
    row_index = Column(Integer)                # original row number in file
    error_message = Column(Text)
    raw_data = Column(Text)                    # JSON string of the row
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))