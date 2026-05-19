from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.models.audit_log_model import AuditLog
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/activities/attrition", tags=["Attrition Activity"])

# Attrition‑related modules we want to track
ATTRITION_MODULES = [
    "Attrition", "Prediction", "HighRisk", "Monitoring",
    "Intervention", "HR Intervention", "Alert", "Forecast"
]

@router.get("")
def get_attrition_activities(
    since: Optional[str] = Query(None, description="ISO timestamp, only return activities after this time"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns recent attrition‑related activity log entries.
    Use `since` for incremental polling.
    """
    query = db.query(AuditLog).filter(AuditLog.module.in_(ATTRITION_MODULES))

    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            query = query.filter(AuditLog.created_at > since_dt)
        except ValueError:
            pass   # ignore invalid timestamps

    activities = query.order_by(desc(AuditLog.created_at)).limit(limit).all()

    result = []
    for a in activities:
        result.append({
            "id": a.id,
            "performed_by": a.performed_by,
            "action": a.action,
            "module": a.module,
            "target": a.target,
            "details": a.details,
            "created_at": a.created_at.isoformat()
        })
    return result