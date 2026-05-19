from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.models.high_risk_alert import HighRiskAlert
from app.models.risk_change_log import RiskChangeLog
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

# ───────── Existing endpoints (unchanged) ─────────────

# High‑risk employees list
@router.get("/high-risk-employees")
def high_risk_employees(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    """Return all employees with at least one High risk prediction, with latest details."""
    high_preds = (
        db.query(AttritionPrediction)
        .filter(AttritionPrediction.risk_category == "High")
        .outerjoin(Employee, AttritionPrediction.employee_id == Employee.id)
    )
    if department:
        high_preds = high_preds.filter(Employee.department == department)

    high_preds = high_preds.order_by(desc(AttritionPrediction.predicted_at)).all()

    # Group by employee_id and keep the latest
    emp_dict = {}
    for p in high_preds:
        if p.employee_id and p.employee_id not in emp_dict:
            emp_dict[p.employee_id] = p

    result = []
    for emp_id, pred in emp_dict.items():
        emp = pred.employee
        result.append({
            "employee_id": emp_id,
            "employee_name": emp.name if emp else None,
            "identifier": pred.identifier,
            "department": emp.department if emp else None,
            "risk_score": pred.risk_score,
            "risk_percentage": round(pred.risk_score * 100, 1),
            "predicted_at": pred.predicted_at.isoformat()
        })
    return result


# General alerts (paginated)
@router.get("/alerts")
def get_alerts(
    severity: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    query = db.query(HighRiskAlert)
    if severity:
        query = query.filter(HighRiskAlert.severity == severity)
    if is_read is not None:
        query = query.filter(HighRiskAlert.is_read == is_read)
    total = query.count()
    alerts = query.order_by(desc(HighRiskAlert.created_at)) \
                  .offset((page-1)*limit).limit(limit).all()

    items = []
    for a in alerts:
        emp = a.employee
        items.append({
            "id": a.id,
            "employee_name": emp.name if emp else None,
            "message": a.message,
            "severity": a.severity,
            "is_read": a.is_read,
            "created_at": a.created_at.isoformat()
        })
    return {"total": total, "page": page, "limit": limit, "alerts": items}


# Mark alert as read
@router.put("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    alert = db.query(HighRiskAlert).get(alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.is_read = True
    db.commit()
    return {"detail": "Alert marked as read"}


# Employee risk history
@router.get("/employee/{employee_id}/risk-history")
def employee_risk_history(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    logs = (
        db.query(RiskChangeLog)
        .filter(RiskChangeLog.employee_id == employee_id)
        .order_by(RiskChangeLog.created_at.asc())
        .all()
    )
    return [
        {
            "id": log.id,
            "employee_id": log.employee_id,
            "previous_risk_score": log.previous_risk_score,
            "new_risk_score": log.new_risk_score,
            "previous_category": log.previous_category,
            "new_category": log.new_category,
            "change_type": log.change_type,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]


# ───────── Phase 3 – Module 4 new endpoints ─────────

# Acknowledge an alert (smart alerts only)
@router.put("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    alert = db.query(HighRiskAlert).get(alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    db.commit()
    return {"success": True}


# Get smart alerts (filtered by category, priority, acknowledged)
@router.get("/smart-alerts")
def get_smart_alerts(
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    query = db.query(HighRiskAlert).filter(HighRiskAlert.category != None)  # only smart alerts
    if category:
        query = query.filter(HighRiskAlert.category == category)
    if priority:
        query = query.filter(HighRiskAlert.priority == priority)
    if acknowledged is not None:
        query = query.filter(HighRiskAlert.acknowledged == acknowledged)

    total = query.count()
    alerts = (
        query.order_by(desc(HighRiskAlert.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for a in alerts:
        emp = a.employee
        items.append({
            "id": a.id,
            "employee_name": emp.name if emp else "N/A",
            "message": a.message,
            "severity": a.severity,
            "priority": a.priority,
            "category": a.category,
            "is_read": a.is_read,
            "acknowledged": a.acknowledged,
            "created_at": a.created_at.isoformat()
        })
    return {"total": total, "page": page, "limit": limit, "alerts": items}