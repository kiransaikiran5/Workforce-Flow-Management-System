from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationCreate(BaseModel):
    user_email: str
    message: str
    type: Optional[str] = "general"
    category: Optional[str] = "general"
    priority: Optional[str] = "normal"
    target_email: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    user_email: str
    message: str
    type: str
    category: str
    priority: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True