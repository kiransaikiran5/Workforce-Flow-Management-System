# app/routes/notification_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.models.notification_model import Notification
from app.models.user_model import User
from app.models.email_log import EmailLog
from app.models.notification_preference import NotificationPreference
from app.utils.dependencies import get_current_user

# ------------------------------------------------------------
# SCHEMAS (inline)
# ------------------------------------------------------------
class NotificationCreate(BaseModel):
    user_email: str
    message: str
    type: str
    category: Optional[str] = None
    priority: Optional[str] = "normal"
    target_email: Optional[str] = None

class NotificationResponse(BaseModel):
    id: int
    message: str
    type: str
    category: Optional[str]
    priority: Optional[str]
    is_read: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True

class NotificationPreferenceOut(BaseModel):
    id: int
    user_id: int
    email_high_risk_alerts: bool
    email_weekly_summary: bool

    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    email_high_risk_alerts: Optional[bool] = None
    email_weekly_summary: Optional[bool] = None


router = APIRouter()

# ======================================================
# CREATE NOTIFICATION
# ======================================================
@router.post("/", response_model=NotificationResponse)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
):
    notification = Notification(
        user_email=payload.user_email,
        message=payload.message,
        type=payload.type,
        category=payload.category,
        priority=payload.priority,
        target_email=payload.target_email,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return {
        "id": notification.id,
        "message": notification.message,
        "type": notification.type,
        "category": notification.category,
        "priority": notification.priority,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }


# ======================================================
# GET MY NOTIFICATIONS
# ======================================================
@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_email == current_user.email)
        .order_by(Notification.created_at.desc())
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_email == current_user.email,
            Notification.is_read == False,
        )
        .count()
    )
    notif_list = []
    for n in notifications:
        notif_list.append({
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "category": n.category,
            "priority": n.priority,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    return {
        "notifications": notif_list,
        "unread_count": unread_count,
    }


# ======================================================
# MARK SINGLE NOTIFICATION AS READ
# ======================================================
@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_email == current_user.email,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"success": True}


# ======================================================
# MARK MULTIPLE NOTIFICATIONS AS READ
# ======================================================
@router.post("/mark-read")
def mark_multiple_read(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    db.query(Notification).filter(
        Notification.id.in_(ids),
        Notification.user_email == current_user.email,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


# ======================================================
# MARK ALL AS READ
# ======================================================
@router.put("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_email == current_user.email,
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


# ======================================================
# DELETE NOTIFICATION
# ======================================================
@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_email == current_user.email,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notification)
    db.commit()
    return {"success": True, "message": "Notification deleted"}


# ======================================================
# NOTIFICATION PREFERENCES
# ======================================================
@router.get("/preferences", response_model=NotificationPreferenceOut)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = db.query(NotificationPreference).filter_by(user_id=current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


@router.put("/preferences", response_model=NotificationPreferenceOut)
def update_preferences(
    update: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = db.query(NotificationPreference).filter_by(user_id=current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)

    if update.email_high_risk_alerts is not None:
        pref.email_high_risk_alerts = update.email_high_risk_alerts
    if update.email_weekly_summary is not None:
        pref.email_weekly_summary = update.email_weekly_summary

    db.commit()
    db.refresh(pref)
    return pref


# ======================================================
# ALERT EMAIL HISTORY (SAFE)
# ======================================================
@router.get("/alert-emails")
def get_alert_emails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
):
    """Return all high‑risk alert emails, newest first."""
    emails = (
        db.query(EmailLog)
        .filter(EmailLog.subject.ilike("%High Attrition Risk%"))
        .order_by(EmailLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "recipient": e.recipient,
            "subject": e.subject,
            "status": getattr(e, "status", "sent"),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in emails
    ]