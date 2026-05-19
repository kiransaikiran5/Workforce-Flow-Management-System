# app/utils/activity_logger.py
from sqlalchemy.orm import Session
from app.models.activity_model import Activity
from app.models.audit_log_model import AuditLog
from datetime import datetime, timezone

def log_activity(
    db: Session,
    *,
    user_email: str,
    action: str,
    module: str = "general",
    details: str = None,
    target: str = None,
    ip_address: str = None,
    device: str = None,
):
    """
    Create entries in BOTH Activity (for real‑time feed) and AuditLog (for history).
    The 'module' field is now stored directly in AuditLog.module.
    """

    # 1) Write to Activity table
    activity = Activity(
        user_email=user_email,
        action=action,
        module=module,
        details=details,
        ip_address=ip_address,
        device=device,
    )
    db.add(activity)

    # 2) Write to AuditLog table – include module!
    audit = AuditLog(
        performed_by=user_email,
        action=action,
        module=module,                         # ✅ store module directly
        target=user_email,
        details=f"[{module}] {details}" if details else f"[{module}]",
        created_at=datetime.now(timezone.utc), # use utc now
    )
    db.add(audit)

    db.commit()