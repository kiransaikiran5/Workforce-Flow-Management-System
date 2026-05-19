from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.models.high_risk_alert import HighRiskAlert
from app.models.risk_change_log import RiskChangeLog
from app.models.employee_model import Employee
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/live-monitoring", tags=["Live Monitoring"])

@router.get("/stream")
def get_live_stream(
    since: Optional[str] = Query(None, description="ISO timestamp, only return items after this time"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns a merged, time‑ordered list of high‑risk alerts and risk change logs.
    Use `since` for polling (pass the timestamp of the newest item you already have).
    """
    alerts_query = db.query(HighRiskAlert)
    changes_query = db.query(RiskChangeLog)

    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            alerts_query = alerts_query.filter(HighRiskAlert.created_at > since_dt)
            changes_query = changes_query.filter(RiskChangeLog.created_at > since_dt)
        except ValueError:
            pass

    # Get latest records
    alerts = alerts_query.order_by(desc(HighRiskAlert.created_at)).limit(limit).all()
    changes = changes_query.order_by(desc(RiskChangeLog.created_at)).limit(limit).all()

    items = []

    for a in alerts:
        # Lookup employee if employee_id is set
        emp_name = "N/A"
        if a.employee_id:
            emp = db.query(Employee).get(a.employee_id)
            if emp:
                emp_name = emp.name
        items.append({
            "type": "alert",
            "id": a.id,
            "created_at": a.created_at.isoformat(),
            "employee_name": emp_name,
            "message": a.message,
            "severity": a.severity,
            "is_read": a.is_read,
        })

    for c in changes:
        emp_name = "N/A"
        if c.employee_id:
            emp = db.query(Employee).get(c.employee_id)
            if emp:
                emp_name = emp.name
        items.append({
            "type": "risk_change",
            "id": c.id,
            "created_at": c.created_at.isoformat(),
            "employee_name": emp_name,
            "previous_category": c.previous_category,
            "new_category": c.new_category,
            "previous_risk_score": c.previous_risk_score,
            "new_risk_score": c.new_risk_score,
            "change_type": c.change_type,
        })

    # Sort by time descending (newest first)
    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items[:limit]