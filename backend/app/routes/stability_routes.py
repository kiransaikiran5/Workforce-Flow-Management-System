from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/stability", tags=["Workforce Stability"])


def compute_stability_score(avg_risk: float, trend_direction: str) -> float:
    """
    Simple stability score:
    - Base: (1 - avg_risk) * 100  (higher retention probability = more stable)
    - Trend adjustment: +10 for improving, -10 for declining, 0 for stable
    """
    base = (1 - avg_risk) * 100
    if trend_direction == "improving":
        base += 10
    elif trend_direction == "declining":
        base -= 10
    return round(min(max(base, 0), 100), 1)


def get_trend_direction(recent: int, older: int) -> str:
    if older == 0:
        return "stable"
    change = (recent - older) / older
    if change > 0.2:
        return "declining"  # more high-risk => stability declining
    elif change < -0.2:
        return "improving"
    return "stable"


@router.get("/overview")
def get_stability_overview(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    """
    Returns overall workforce stability metrics and per‑department breakdown.
    """
    now = datetime.now(timezone.utc)
    three_months_ago = now - timedelta(days=90)
    six_months_ago = now - timedelta(days=180)

    # ---- Overall metrics ----
    total_emps = db.query(Employee).count()
    predictions = db.query(AttritionPrediction).filter(
        AttritionPrediction.risk_category != None
    ).all()

    if not predictions:
        return {
            "overall": {
                "total_employees": total_emps,
                "stability_score": 100.0,
                "retention_forecast": 100.0,
                "avg_risk_percentage": 0.0,
                "high_risk_count": 0,
                "trend": "stable"
            },
            "departments": []
        }

    # Average risk score across all predictions (latest per employee ideally, but simple average works)
    avg_risk = sum(p.risk_score for p in predictions) / len(predictions)
    high_risk_count = sum(1 for p in predictions if p.risk_category == "High")

    # Recent vs older high-risk count for trend
    recent_high = db.query(AttritionPrediction).filter(
        AttritionPrediction.risk_category == "High",
        AttritionPrediction.predicted_at >= three_months_ago
    ).count()
    older_high = db.query(AttritionPrediction).filter(
        AttritionPrediction.risk_category == "High",
        AttritionPrediction.predicted_at >= six_months_ago,
        AttritionPrediction.predicted_at < three_months_ago
    ).count()

    trend = get_trend_direction(recent_high, older_high)
    stability_score = compute_stability_score(avg_risk, trend)
    retention_forecast = round((1 - avg_risk) * 100, 1)

    overall = {
        "total_employees": total_emps,
        "stability_score": stability_score,
        "retention_forecast": retention_forecast,
        "avg_risk_percentage": round(avg_risk * 100, 1),
        "high_risk_count": high_risk_count,
        "trend": trend
    }

    # ---- Per‑department metrics ----
    dept_data = {}
    # Get all employees with their latest prediction (subquery approach)
    latest_pred_subq = (
        db.query(
            AttritionPrediction.employee_id,
            func.max(AttritionPrediction.predicted_at).label('max_date')
        )
        .filter(AttritionPrediction.employee_id != None)
        .group_by(AttritionPrediction.employee_id)
        .subquery()
    )

    emps_with_latest = (
        db.query(Employee, AttritionPrediction)
        .join(AttritionPrediction, Employee.id == AttritionPrediction.employee_id)
        .join(latest_pred_subq,
              (AttritionPrediction.employee_id == latest_pred_subq.c.employee_id) &
              (AttritionPrediction.predicted_at == latest_pred_subq.c.max_date))
        .all()
    )

    for emp, pred in emps_with_latest:
        dept = emp.department or "Not Assigned"
        if dept not in dept_data:
            dept_data[dept] = {
                "total": 0,
                "high_risk": 0,
                "risk_scores": [],
                "recent_high": 0,
                "older_high": 0
            }
        dept_data[dept]["total"] += 1
        if pred.risk_category == "High":
            dept_data[dept]["high_risk"] += 1
        dept_data[dept]["risk_scores"].append(pred.risk_score)

    # Count high-risk predictions in recent/older periods per department
    recent_dept_high = (
        db.query(Employee.department, func.count())
        .join(AttritionPrediction, Employee.id == AttritionPrediction.employee_id)
        .filter(AttritionPrediction.risk_category == "High",
                AttritionPrediction.predicted_at >= three_months_ago)
        .group_by(Employee.department)
        .all()
    )
    older_dept_high = (
        db.query(Employee.department, func.count())
        .join(AttritionPrediction, Employee.id == AttritionPrediction.employee_id)
        .filter(AttritionPrediction.risk_category == "High",
                AttritionPrediction.predicted_at >= six_months_ago,
                AttritionPrediction.predicted_at < three_months_ago)
        .group_by(Employee.department)
        .all()
    )

    for dept, cnt in recent_dept_high:
        if dept in dept_data:
            dept_data[dept]["recent_high"] = cnt
        else:
            dept_data[dept] = {"total": 0, "high_risk": 0, "risk_scores": [],
                               "recent_high": cnt, "older_high": 0}
    for dept, cnt in older_dept_high:
        if dept in dept_data:
            dept_data[dept]["older_high"] = cnt
        else:
            dept_data[dept] = {"total": 0, "high_risk": 0, "risk_scores": [],
                               "recent_high": 0, "older_high": cnt}

    departments = []
    for dept, info in dept_data.items():
        avg_dept_risk = sum(info["risk_scores"]) / len(info["risk_scores"]) if info["risk_scores"] else 0
        dept_trend = get_trend_direction(info["recent_high"], info["older_high"])
        dept_stability = compute_stability_score(avg_dept_risk, dept_trend)
        departments.append({
            "department": dept,
            "total_employees": info["total"],
            "high_risk_count": info["high_risk"],
            "avg_risk_percentage": round(avg_dept_risk * 100, 1),
            "retention_forecast": round((1 - avg_dept_risk) * 100, 1),
            "stability_score": dept_stability,
            "trend": dept_trend
        })

    return {
        "overall": overall,
        "departments": departments
    }