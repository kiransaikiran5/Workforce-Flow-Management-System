from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from typing import Optional, List
import pandas as pd
import io
from datetime import datetime, timezone, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.utils.dependencies import require_roles
from app.services.forecast_helper import linear_forecast
from sqlalchemy import extract, func, case
import numpy as np

router = APIRouter(prefix="/reports/attrition", tags=["Attrition Reports"])

# ---------- Helper to build filtered query ----------
def _filtered_query(db: Session, department: Optional[str] = None,
                    risk_category: Optional[str] = None,
                    start_date: Optional[str] = None,
                    end_date: Optional[str] = None):
    query = db.query(AttritionPrediction).outerjoin(Employee, AttritionPrediction.employee_id == Employee.id)
    if department:
        query = query.filter(Employee.department == department)
    if risk_category:
        query = query.filter(AttritionPrediction.risk_category == risk_category)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(AttritionPrediction.predicted_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(AttritionPrediction.predicted_at <= end_dt)
        except ValueError:
            pass
    return query

# ---------- Data endpoints (for frontend) ----------
@router.get("/high-risk")
def get_high_risk_report(
    department: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    query = _filtered_query(db, department, risk_category, start_date, end_date)
    total = query.count()
    predictions = query.order_by(AttritionPrediction.risk_score.desc()) \
                       .offset((page-1)*limit).limit(limit).all()
    items = []
    for p in predictions:
        items.append({
            "id": p.id,
            "employee_name": p.employee.name if p.employee else None,
            "identifier": p.identifier,
            "department": p.employee.department if p.employee else None,
            "risk_score": round(p.risk_score * 100, 1),   # percentage
            "risk_category": p.risk_category,
            "predicted_at": p.predicted_at.isoformat()
        })
    return {"total": total, "page": page, "limit": limit, "items": items}

@router.get("/department-summary")
def get_department_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    query = db.query(
        Employee.department,
        func.count(AttritionPrediction.id).label("total"),
        func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label("high"),
        func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label("medium"),
        func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label("low")
    ).join(Employee, AttritionPrediction.employee_id == Employee.id, isouter=True) \
     .filter(Employee.department != None)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(AttritionPrediction.predicted_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(AttritionPrediction.predicted_at <= end_dt)
        except ValueError:
            pass
    results = query.group_by(Employee.department).all()
    return [
        {"department": r.department, "total": r.total, "high": r.high, "medium": r.medium, "low": r.low}
        for r in results
    ]

@router.get("/monthly-trend")
def get_monthly_trend(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    query = db.query(
        extract('year', AttritionPrediction.predicted_at).label('year'),
        extract('month', AttritionPrediction.predicted_at).label('month'),
        func.count().label('total'),
        func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label('high'),
        func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label('medium'),
        func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label('low')
    )
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(AttritionPrediction.predicted_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(AttritionPrediction.predicted_at <= end_dt)
        except ValueError:
            pass
    results = query.group_by('year', 'month').order_by('year', 'month').all()
    return [
        {"month": f"{int(r.year)}-{int(r.month):02d}", "total": r.total, "high": r.high, "medium": r.medium, "low": r.low}
        for r in results
    ]

# ---------- Export helpers ----------
def _build_dataframe(db: Session, department, risk_category, start_date, end_date):
    query = _filtered_query(db, department, risk_category, start_date, end_date)
    predictions = query.order_by(AttritionPrediction.risk_score.desc()).all()
    data = []
    for p in predictions:
        data.append({
            "Employee": p.employee.name if p.employee else p.identifier,
            "Identifier": p.identifier,
            "Department": p.employee.department if p.employee else "",
            "Risk Score (%)": round(p.risk_score * 100, 1),
            "Risk Category": p.risk_category,
            "Predicted At": p.predicted_at.strftime("%Y-%m-%d %H:%M")
        })
    return pd.DataFrame(data)

def _export_excel(df: pd.DataFrame, filename: str):
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Attrition Report')
    output.seek(0)
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}.xlsx"'
    }
    return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers=headers)

def _export_pdf(df: pd.DataFrame, title: str):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(title, styles['Title']))
    elements.append(Spacer(1, 12))

    # Convert DataFrame to list of lists for Table
    header = df.columns.tolist()
    data = [header] + df.values.tolist()
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4f81bd")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(table)
    doc.build(elements)

    buffer.seek(0)
    headers = {
        'Content-Disposition': f'attachment; filename="{title}.pdf"'
    }
    return StreamingResponse(buffer, media_type='application/pdf', headers=headers)

# ---------- Export endpoints ----------
@router.get("/export/excel")
def export_attrition_excel(
    department: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    df = _build_dataframe(db, department, risk_category, start_date, end_date)
    if df.empty:
        raise HTTPException(status_code=404, detail="No data to export")
    filename = f"attrition_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    return _export_excel(df, filename)

@router.get("/export/pdf")
def export_attrition_pdf(
    department: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "hr"))
):
    df = _build_dataframe(db, department, risk_category, start_date, end_date)
    if df.empty:
        raise HTTPException(status_code=404, detail="No data to export")
    filename = f"Attrition Report {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    return _export_pdf(df, filename)

# ── Predictive Attrition Summary ─────────────────────
@router.get("/predictive-summary")
def predictive_summary(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns forecasted attrition counts for the next 3 months
    using linear regression on monthly historical data.
    """
    # 1. Get last 12 months of data
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    results = (
        db.query(
            extract('year', AttritionPrediction.predicted_at).label('year'),
            extract('month', AttritionPrediction.predicted_at).label('month'),
            func.count().label('total'),
            func.sum(
                case((AttritionPrediction.risk_category == "High", 1), else_=0)
            ).label('high'),
            func.sum(
                case((AttritionPrediction.risk_category == "Medium", 1), else_=0)
            ).label('medium'),
            func.sum(
                case((AttritionPrediction.risk_category == "Low", 1), else_=0)
            ).label('low'),
        )
        .filter(AttritionPrediction.predicted_at >= cutoff)
        .group_by('year', 'month')
        .order_by('year', 'month')
        .all()
    )

    history = []
    for r in results:
        month_str = f"{int(r.year)}-{int(r.month):02d}"
        history.append({"month": month_str, "high": r.high, "medium": r.medium, "low": r.low})

    if len(history) < 2:
        return {"forecast": [], "summary": "Not enough historical data"}

    # Prepare indices
    indices = list(range(len(history)))
    high_vals = [h["high"] for h in history]
    medium_vals = [h["medium"] for h in history]
    low_vals = [h["low"] for h in history]

    # Forecast next 3 months
    high_fc = linear_forecast(list(zip(indices, high_vals)), 3)
    medium_fc = linear_forecast(list(zip(indices, medium_vals)), 3)
    low_fc = linear_forecast(list(zip(indices, low_vals)), 3)

    last_date = datetime.now(timezone.utc)
    forecast = []
    for i in range(3):
        next_date = last_date + timedelta(days=30 * (i + 1))
        month_str = next_date.strftime('%Y-%m')
        forecast.append({
            "month": month_str,
            "high": max(0, round(high_fc[i])),
            "medium": max(0, round(medium_fc[i])),
            "low": max(0, round(low_fc[i]))
        })

    # Determine trend direction (simple: compare last historical high with first forecast)
    trend = "stable"
    if history:
        last_high = history[-1]["high"]
        first_forecast_high = forecast[0]["high"] if forecast else last_high
        if first_forecast_high > last_high:
            trend = "increasing"
        elif first_forecast_high < last_high:
            trend = "decreasing"

    return {
        "historical": history[-6:],   # last 6 months for chart
        "forecast": forecast,
        "trend": trend,
        "predicted_next_month": forecast[0] if forecast else None
    }
    
# ── Employee Trend Analysis ─────────────────────────
@router.get("/employee-trend/{employee_id}")
def employee_trend(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns the risk score history for a specific employee.
    """
    preds = (
        db.query(AttritionPrediction)
        .filter(AttritionPrediction.employee_id == employee_id)
        .order_by(AttritionPrediction.predicted_at.asc())
        .all()
    )
    if not preds:
        raise HTTPException(404, "No predictions found for this employee")

    return [
        {
            "id": p.id,
            "risk_score": round(p.risk_score * 100, 1),
            "risk_category": p.risk_category,
            "predicted_at": p.predicted_at.isoformat()
        }
        for p in preds
    ]
    
# ── Department Forecast Summary ─────────────────────
@router.get("/department-forecast")
def department_forecast(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    """
    Returns current department risk counts plus a simple forecast for next month
    based on the last 3 months' moving average.
    """
    three_months_ago = datetime.now(timezone.utc) - timedelta(days=90)
    hist = (
        db.query(
            Employee.department,
            extract('year', AttritionPrediction.predicted_at).label('year'),
            extract('month', AttritionPrediction.predicted_at).label('month'),
            func.count().label('total'),
            func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label('high'),
            func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label('medium'),
            func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label('low'),
        )
        .join(Employee, AttritionPrediction.employee_id == Employee.id, isouter=True)
        .filter(Employee.department != None)
        .filter(AttritionPrediction.predicted_at >= three_months_ago)
        .group_by(Employee.department, 'year', 'month')
        .order_by('year', 'month')
        .all()
    )

    dept_data = {}
    for row in hist:
        dept = row.department
        if dept not in dept_data:
            dept_data[dept] = {"high_vals": [], "medium_vals": [], "low_vals": []}
        dept_data[dept]["high_vals"].append(row.high)
        dept_data[dept]["medium_vals"].append(row.medium)
        dept_data[dept]["low_vals"].append(row.low)

    forecast = []
    for dept, vals in dept_data.items():
        avg_high = sum(vals["high_vals"]) / len(vals["high_vals"]) if vals["high_vals"] else 0
        avg_medium = sum(vals["medium_vals"]) / len(vals["medium_vals"]) if vals["medium_vals"] else 0
        avg_low = sum(vals["low_vals"]) / len(vals["low_vals"]) if vals["low_vals"] else 0
        forecast.append({
            "department": dept,
            "predicted_high": round(avg_high),
            "predicted_medium": round(avg_medium),
            "predicted_low": round(avg_low)
        })
    return forecast