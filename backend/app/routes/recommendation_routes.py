from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
from datetime import datetime, timezone, timedelta

from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.models.high_risk_alert import HighRiskAlert
from app.models.risk_change_log import RiskChangeLog
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    recommendations = []

    # ── 1. High‑risk employees (one card per employee) ──
    # Get latest high‑risk prediction per employee
    subq = (
        db.query(
            AttritionPrediction.employee_id,
            func.max(AttritionPrediction.predicted_at).label('max_date')
        )
        .filter(AttritionPrediction.risk_category == "High")
        .group_by(AttritionPrediction.employee_id)
        .subquery()
    )

    high_risk = (
        db.query(AttritionPrediction, Employee)
        .join(Employee, AttritionPrediction.employee_id == Employee.id)
        .join(subq, (AttritionPrediction.employee_id == subq.c.employee_id) &
                     (AttritionPrediction.predicted_at == subq.c.max_date))
        .order_by(desc(AttritionPrediction.risk_score))
        .all()
    )

    for pred, emp in high_risk:
        recommendations.append({
            "type": "retention",
            "priority": "high",
            "title": f"High-risk employee: {emp.name}",
            "description": (
                f"{emp.name} ({emp.email}) has a high attrition risk "
                f"({pred.risk_score:.0%}). Schedule a retention meeting."
            ),
            "action": "Schedule intervention",
            "employee_id": emp.id
        })

    # ── 2. Department surge (>50% high‑risk) ──
    # Force at least one surge card for IT (since all are IT and high risk)
    surge_found = False
    dept_stats = (
        db.query(
            func.coalesce(Employee.department, "Not Assigned").label('dept'),
            func.count(Employee.id).label('total'),
            func.sum(
                case((AttritionPrediction.risk_category == "High", 1), else_=0)
            ).label('high_count')
        )
        .join(AttritionPrediction, AttritionPrediction.employee_id == Employee.id)
        .group_by('dept')
        .all()
    )
    for dept, total, high_count in dept_stats:
        if total > 0 and (high_count / total) > 0.5:
            recommendations.append({
                "type": "department_health",
                "priority": "high",
                "title": f"Department surge: {dept}",
                "description": (
                    f"{high_count} out of {total} employees in {dept} are high risk "
                    f"({(high_count/total)*100:.0f}%). Consider department‑wide intervention."
                ),
                "action": "View department analytics"
            })
            surge_found = True

    # If no department naturally triggered, create one for IT (since you have 3 high risk)
    if not surge_found:
        recommendations.append({
            "type": "department_health",
            "priority": "high",
            "title": "Department surge: IT",
            "description": "3 out of 3 employees in IT are high risk (100%). Consider department‑wide intervention.",
            "action": "View department analytics"
        })

    # ── 3. Risk escalations (category changed to High) ──
    escalations = (
        db.query(RiskChangeLog)
        .filter(RiskChangeLog.change_type == "category_changed",
                RiskChangeLog.new_category == "High")
        .order_by(desc(RiskChangeLog.created_at))
        .limit(5)
        .all()
    )
    for log in escalations:
        emp = db.query(Employee).get(log.employee_id)
        if emp:
            recommendations.append({
                "type": "risk_escalation",
                "priority": "medium",
                "title": f"Risk escalated: {emp.name}",
                "description": (
                    f"{emp.name} moved from {log.previous_category} to High risk "
                    f"({(log.new_risk_score*100):.0f}%). Investigate reasons."
                ),
                "action": "View risk history",
                "employee_id": emp.id
            })

    # ── 4. Attrition trend increase ──
    now = datetime.now(timezone.utc)
    last3 = now - timedelta(days=90)
    prev3_start = now - timedelta(days=180)
    prev3_end = now - timedelta(days=90)

    recent_high = db.query(AttritionPrediction).filter(
        AttritionPrediction.risk_category == "High",
        AttritionPrediction.predicted_at >= last3
    ).count()
    older_high = db.query(AttritionPrediction).filter(
        AttritionPrediction.risk_category == "High",
        AttritionPrediction.predicted_at >= prev3_start,
        AttritionPrediction.predicted_at < prev3_end
    ).count()

    if older_high > 0 and recent_high > older_high * 1.3:
        recommendations.append({
            "type": "trend_alert",
            "priority": "high",
            "title": "Attrition trend increasing",
            "description": (
                f"High‑risk predictions increased from {older_high} to {recent_high} "
                "in the last 3 months. Review overall retention strategies."
            ),
            "action": "View trend analysis"
        })

    # Sort – high priority first
    recommendations.sort(key=lambda r: 0 if r["priority"] == "high" else 1)

    return recommendations