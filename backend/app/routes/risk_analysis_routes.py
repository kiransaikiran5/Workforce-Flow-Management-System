from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/risk-analysis", tags=["Risk Analysis"])

# Helper to compute confidence (same as earlier modules)
def compute_confidence(risk_score: float) -> float:
    return round(100.0 - 200.0 * abs(risk_score - 0.5), 2)

# --- 1. Workforce Health Indicators per Department ---
@router.get("/health-indicators")
def get_health_indicators(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns aggregated risk metrics per department:
    total_employees, high_risk_count, avg_risk_score, instability_index (stdev of risk scores)
    """
    # Get all predictions linked to employees with department
    preds_with_emp = (
        db.query(AttritionPrediction, Employee)
        .join(Employee, AttritionPrediction.employee_id == Employee.id)
        .filter(Employee.department != None)
        .all()
    )

    dept_data = {}
    for pred, emp in preds_with_emp:
        dept = emp.department
        if dept not in dept_data:
            dept_data[dept] = {
                "total": 0,
                "high_risk": 0,
                "risk_scores": []
            }
        dept_data[dept]["total"] += 1
        if pred.risk_category == "High":
            dept_data[dept]["high_risk"] += 1
        dept_data[dept]["risk_scores"].append(pred.risk_score)

    result = []
    for dept, info in dept_data.items():
        avg = sum(info["risk_scores"]) / len(info["risk_scores"]) if info["risk_scores"] else 0
        # Instability index = standard deviation of risk scores
        variance = sum((x - avg) ** 2 for x in info["risk_scores"]) / len(info["risk_scores"]) if info["risk_scores"] else 0
        std_dev = variance ** 0.5
        result.append({
            "department": dept,
            "total_employees": info["total"],
            "high_risk_count": info["high_risk"],
            "avg_risk_score": round(avg * 100, 1),   # as percentage
            "instability_index": round(std_dev * 100, 1)
        })
    return result

# --- 2. Employee Risk List (with retention score) ---
@router.get("/employee-risk")
def get_employee_risk_list(
    department: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns employees with their latest risk prediction and a retention score.
    Retention score = (1 - risk_score) * 100, i.e., probability of staying.
    """
    query = db.query(AttritionPrediction).outerjoin(Employee, AttritionPrediction.employee_id == Employee.id)
    if department:
        query = query.filter(Employee.department == department)
    if risk_category:
        query = query.filter(AttritionPrediction.risk_category == risk_category)

    # Get latest prediction per employee (subquery approach)
    # For simplicity, we'll fetch all matching and group in Python (works for moderate datasets)
    preds = query.order_by(AttritionPrediction.predicted_at.desc()).all()
    # Keep only the latest per employee_id
    latest = {}
    for p in preds:
        if p.employee_id and p.employee_id not in latest:
            latest[p.employee_id] = p
        # If no employee_id, use identifier
        elif p.employee_id is None and p.identifier not in latest:
            latest[p.identifier] = p

    # Convert to list and paginate
    items = list(latest.values())
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    page_items = items[start:end]

    result = []
    for p in page_items:
        emp = p.employee
        retention_score = round((1 - p.risk_score) * 100, 1)
        result.append({
            "employee_id": p.employee_id,
            "employee_name": emp.name if emp else None,
            "identifier": p.identifier,
            "department": emp.department if emp else None,
            "risk_score": round(p.risk_score * 100, 1),
            "risk_category": p.risk_category,
            "retention_score": retention_score,
            "confidence_score": compute_confidence(p.risk_score),
            "predicted_at": p.predicted_at.isoformat()
        })
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": result
    }

# --- 3. Workforce Instability Pattern (monthly risk distribution) ---
@router.get("/instability-pattern")
def get_instability_pattern(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns monthly counts of High/Medium/Low for the past 12 months to show instability.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    results = (
        db.query(
            func.date_trunc('month', AttritionPrediction.predicted_at).label('month'),
            func.count().label('total'),
            func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label('high'),
            func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label('medium'),
            func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label('low')
        )
        .filter(AttritionPrediction.predicted_at >= cutoff)
        .group_by('month')
        .order_by('month')
        .all()
    )
    return [
        {
            "month": r.month.strftime('%Y-%m'),
            "total": r.total,
            "high": r.high,
            "medium": r.medium,
            "low": r.low
        }
        for r in results
    ]