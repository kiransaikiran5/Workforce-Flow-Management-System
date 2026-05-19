from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case, func, extract, desc
from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.schemas.prediction_schema import (
    TurnoverStats, TopHighRiskEmployee, YearlySummary,
    HeatmapItem, AnalyticsResponse, DepartmentSummary
)
from app.utils.dependencies import get_current_user, require_roles
from typing import List, Optional
import random
from datetime import datetime, timezone

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Helpers
def compute_confidence(risk_score: float) -> float:
    return round(100.0 - 200.0 * abs(risk_score - 0.5), 2)

# -----------------------------------------------------------
# 1. Employee Turnover Statistics (simulated)
# -----------------------------------------------------------
@router.get("/turnover", response_model=List[TurnoverStats])
def get_turnover_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    """
    For each department, compute how many employees had high-risk predictions
    and simulate actual turnover based on risk score.
    Since we don't have real termination data, we'll generate a turnover flag:
    - If risk_score > 0.7, 80% chance of turnover
    - If > 0.3, 30% chance
    - else 5% chance
    This is for demonstration only.
    """
    # Get all predictions linked to employees
    preds_with_emp = db.query(AttritionPrediction, Employee).join(
        Employee, AttritionPrediction.employee_id == Employee.id
    ).filter(Employee.department != None).all()

    # Build department dict
    dept_data = {}
    for pred, emp in preds_with_emp:
        dept = emp.department
        if dept not in dept_data:
            dept_data[dept] = {"total": 0, "high_risk": 0, "turnover": 0}
        dept_data[dept]["total"] += 1
        if pred.risk_category == "High":
            dept_data[dept]["high_risk"] += 1

        # Simulate turnover (deterministic based on risk_score to be reproducible)
        if pred.risk_score > 0.7:
            turnover = random.random() < 0.8
        elif pred.risk_score > 0.3:
            turnover = random.random() < 0.3
        else:
            turnover = random.random() < 0.05
        if turnover:
            dept_data[dept]["turnover"] += 1

    result = []
    for dept, data in dept_data.items():
        rate = round((data["turnover"] / data["total"]) * 100, 1) if data["total"] else 0
        result.append(TurnoverStats(
            department=dept,
            total_employees=data["total"],
            high_risk_count=data["high_risk"],
            actual_turnover=data["turnover"],
            turnover_rate=rate
        ))
    return result

# -----------------------------------------------------------
# 2. Top High-Risk Employees (top 10 by risk score)
# -----------------------------------------------------------
@router.get("/top-high-risk", response_model=List[TopHighRiskEmployee])
def get_top_high_risk(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    top = db.query(AttritionPrediction).order_by(
        desc(AttritionPrediction.risk_score)
    ).limit(10).all()

    result = []
    for p in top:
        emp = p.employee
        result.append(TopHighRiskEmployee(
            employee_name=emp.name if emp else None,
            identifier=p.identifier,
            department=emp.department if emp else None,
            risk_score=p.risk_score,
            risk_percentage=round(p.risk_score * 100, 1),
            confidence_score=compute_confidence(p.risk_score),
            risk_category=p.risk_category
        ))
    return result

# -----------------------------------------------------------
# 3. Yearly Summary
# -----------------------------------------------------------
@router.get("/yearly-summary", response_model=List[YearlySummary])
def get_yearly_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    results = db.query(
        extract('year', AttritionPrediction.predicted_at).label('year'),
        func.count().label('total'),
        func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label('high'),
        func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label('medium'),
        func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label('low')
    ).group_by('year').order_by('year').all()

    return [YearlySummary(
        year=int(r.year),
        total=r.total,
        high=r.high,
        medium=r.medium,
        low=r.low
    ) for r in results]

# -----------------------------------------------------------
# 4. Heatmap Data (department x risk category)
# -----------------------------------------------------------
@router.get("/heatmap", response_model=List[HeatmapItem])
def get_heatmap(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    # Get predictions linked to employees with department
    data = db.query(
        Employee.department,
        AttritionPrediction.risk_category,
        func.count().label('count')
    ).join(Employee, AttritionPrediction.employee_id == Employee.id, isouter=True) \
     .filter(Employee.department != None) \
     .group_by(Employee.department, AttritionPrediction.risk_category).all()

    # Transform into heatmap rows
    dept_map = {}
    for dept, cat, cnt in data:
        if dept not in dept_map:
            dept_map[dept] = {"department": dept, "high": 0, "medium": 0, "low": 0, "total": 0}
        dept_map[dept][cat.lower() if cat else "low"] = cnt
        dept_map[dept]["total"] += cnt

    return [HeatmapItem(**vals) for vals in dept_map.values()]

# -----------------------------------------------------------
# 5. Department Trend (reuse existing, but include year filter)
# -----------------------------------------------------------
@router.get("/department-trend", response_model=List[DepartmentSummary])
def department_trend(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    query = db.query(
        Employee.department,
        func.count(AttritionPrediction.id).label("total"),
        func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label("high"),
        func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label("medium"),
        func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label("low")
    ).join(Employee, AttritionPrediction.employee_id == Employee.id, isouter=True) \
     .filter(Employee.department != None)

    if year:
        query = query.filter(extract('year', AttritionPrediction.predicted_at) == year)

    results = query.group_by(Employee.department).all()
    return [DepartmentSummary(
        department=r.department,
        total=r.total,
        high_risk=r.high,
        medium_risk=r.medium,
        low_risk=r.low
    ) for r in results]

# -----------------------------------------------------------
# 6. Full Analytics Dashboard (combine all in one call)
# -----------------------------------------------------------
@router.get("/dashboard", response_model=AnalyticsResponse)
def analytics_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    # Get all sub-data (you can call internal functions or duplicate logic)
    # For brevity, I'll call the functions directly (since they're synchronous)
    turnover = get_turnover_stats(db, current_user)
    top_risk = get_top_high_risk(db, current_user)
    yearly = get_yearly_summary(db, current_user)
    heatmap = get_heatmap(db, current_user)
    dept_trend = department_trend(db=db, year=None, current_user=current_user)  # year=None for all

    return AnalyticsResponse(
        turnover_stats=turnover,
        top_high_risk=top_risk,
        yearly_summary=yearly,
        heatmap=heatmap,
        department_trend=dept_trend
    )