# app/services/notification_service.py
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
from app.models.user_model import User
from app.models.high_risk_alert import HighRiskAlert
from app.models.notification_preference import NotificationPreference
from app.utils.email_service import send_email_logged

def send_high_risk_alert_notification(
    db: Session,
    alert: HighRiskAlert,
    background_tasks: BackgroundTasks = None
):
    """
    Send email notifications for a high‑risk alert to all HR/admin users
    who have email_high_risk_alerts enabled.
    """
    recipients = db.query(User).filter(
        User.role.in_(["hr", "admin"]),
        User.is_active == True
    ).all()

    if not recipients:
        print("ℹ️ No active admin/HR users found – cannot send notification.")
        return

    subject = f"High Attrition Risk Alert: {alert.message[:80]}"
    body = f"""
    <h3>High Attrition Risk Detected</h3>
    <p>{alert.message}</p>
    <p>Severity: {alert.severity}</p>
    <p>Alert ID: {alert.id}</p>
    <p>Date: {alert.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
    <p>Please review the employee and take necessary action.</p>
    """

    for user in recipients:
        # Respect user's notification preferences (default = enabled)
        pref = db.query(NotificationPreference).filter_by(user_id=user.id).first()
        if pref is not None and not pref.email_high_risk_alerts:
            print(f"ℹ️ Skipping email to {user.email} – notifications disabled.")
            continue

        # ✅ Correct call – matches the actual send_email_logged signature
        send_email_logged(
            db=db,
            recipient=user.email,
            subject=subject,
            body=body,
            background_tasks=background_tasks
        )
        print(f"✅ Notification sent to {user.email} (Alert ID: {alert.id})")