from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class DatasetUploadOut(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    total_records: int
    success_records: int
    failed_records: int
    status: str
    error_summary: Optional[str]

    class Config:
        from_attributes = True

class FailedRecordOut(BaseModel):
    id: int
    dataset_upload_id: int
    row_index: int
    error_message: str
    raw_data: str
    created_at: datetime

    class Config:
        from_attributes = True