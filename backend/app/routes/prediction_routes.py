from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case, func, extract
from app.db.database import get_db
from app.services.prediction_service import process_and_predict
from app.models.attrition_prediction import AttritionPrediction
from app.models.employee_model import Employee
from app.models.dataset_upload import DatasetUpload
from app.models.failed_record import FailedRecord
from app.schemas.prediction_schema import (
    PredictionResult, PredictionSummary, DepartmentSummary,
    MonthlyTrendItem, ForecastItem
)
from app.schemas.dataset_schema import DatasetUploadOut, FailedRecordOut
from app.utils.dependencies import get_current_user, require_roles
from typing import List, Optional
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/predictions", tags=["Predictions"])


# ---------- Helper to compute confidence ----------
def compute_confidence(risk_score: float) -> float:
    """
    Confidence is high when risk_score is near 0 or 1,
    low when near 0.5. Scale to 0–100.
    """
    return round(100.0 - 200.0 * abs(risk_score - 0.5), 2)


# --------------------------------------------
# 1. Upload dataset & run prediction
# --------------------------------------------
@router.post("/upload", response_model=PredictionSummary)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(400, "Only CSV or Excel files are allowed")
    contents = await file.read()
    try:
        summary = process_and_predict(db, contents, file.filename)
        return summary
    except ValueError as e:
        raise HTTPException(400, str(e))


# --------------------------------------------
# 2. Overall summary (total counts)
# --------------------------------------------
@router.get("/summary", response_model=PredictionSummary)
def get_overall_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    total = db.query(AttritionPrediction).count()
    high = db.query(AttritionPrediction).filter(AttritionPrediction.risk_category == "High").count()
    medium = db.query(AttritionPrediction).filter(AttritionPrediction.risk_category == "Medium").count()
    low = db.query(AttritionPrediction).filter(AttritionPrediction.risk_category == "Low").count()
    return {"total": total, "high": high, "medium": medium, "low": low}


# --------------------------------------------
# 3. Paginated prediction results (with risk % and confidence)
# --------------------------------------------
@router.get("/results", response_model=List[PredictionResult])
def get_predictions(
    department: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    query = db.query(AttritionPrediction).outerjoin(
        Employee, AttritionPrediction.employee_id == Employee.id
    )
    if department:
        query = query.filter(Employee.department == department)
    if risk_category:
        query = query.filter(AttritionPrediction.risk_category == risk_category)

    predictions = (
        query.order_by(AttritionPrediction.predicted_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return [
        PredictionResult(
            id=p.id,
            employee_id=p.employee_id,
            identifier=p.identifier,
            risk_score=p.risk_score,
            risk_percentage=round(p.risk_score * 100, 1),       # ★ new
            confidence_score=compute_confidence(p.risk_score),  # ★ new
            risk_category=p.risk_category,
            predicted_at=p.predicted_at,
            employee_name=p.employee.name if p.employee else None,
            department=p.employee.department if p.employee else None,
        )
        for p in predictions
    ]


# --------------------------------------------
# 4. Department-wise summary
# --------------------------------------------
@router.get("/department-summary", response_model=List[DepartmentSummary])
def department_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    results = (
        db.query(
            Employee.department,
            func.count(AttritionPrediction.id).label("total"),
            func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label("high"),
            func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label("medium"),
            func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label("low"),
        )
        .join(Employee, AttritionPrediction.employee_id == Employee.id, isouter=True)
        .filter(Employee.department != None)
        .group_by(Employee.department)
        .all()
    )

    return [
        DepartmentSummary(
            department=r.department,
            total=r.total,
            high_risk=r.high,
            medium_risk=r.medium,
            low_risk=r.low,
        )
        for r in results
    ]


# --------------------------------------------
# 5. Dataset upload history
# --------------------------------------------
@router.get("/uploads", response_model=List[DatasetUploadOut])
def get_upload_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    uploads = db.query(DatasetUpload).order_by(DatasetUpload.upload_date.desc()).all()
    return uploads


# --------------------------------------------
# 6. Failed records for a specific upload
# --------------------------------------------
@router.get("/uploads/{upload_id}/failures", response_model=List[FailedRecordOut])
def get_failed_records(
    upload_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    failures = (
        db.query(FailedRecord)
        .filter(FailedRecord.dataset_upload_id == upload_id)
        .all()
    )
    return failures


# ============================================================
#  NEW Module 2 endpoints: Monthly trend & forecast
# ============================================================

# --------------------------------------------
# 7. Monthly trend (last 12 months)
# --------------------------------------------
@router.get("/monthly-trend", response_model=List[MonthlyTrendItem])
def get_monthly_trend(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)

    results = (
        db.query(
            extract("year", AttritionPrediction.predicted_at).label("year"),
            extract("month", AttritionPrediction.predicted_at).label("month"),
            func.count().label("total"),
            func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label("high"),
            func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label("medium"),
            func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label("low"),
        )
        .filter(AttritionPrediction.predicted_at >= cutoff)
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    trend = []
    for r in results:
        month_str = f"{int(r.year)}-{int(r.month):02d}"
        trend.append(
            MonthlyTrendItem(
                month=month_str,
                total=r.total,
                high=r.high,
                medium=r.medium,
                low=r.low,
            )
        )
    return trend


# --------------------------------------------
# 8. Simple forecast (average of last 3 months)
# --------------------------------------------
@router.get("/forecast", response_model=List[ForecastItem])
def get_forecast(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("admin", "hr"))
):
    three_months_ago = datetime.now(timezone.utc) - timedelta(days=90)

    recent = (
        db.query(
            extract("year", AttritionPrediction.predicted_at).label("year"),
            extract("month", AttritionPrediction.predicted_at).label("month"),
            func.sum(case((AttritionPrediction.risk_category == "High", 1), else_=0)).label("high"),
            func.sum(case((AttritionPrediction.risk_category == "Medium", 1), else_=0)).label("medium"),
            func.sum(case((AttritionPrediction.risk_category == "Low", 1), else_=0)).label("low"),
        )
        .filter(AttritionPrediction.predicted_at >= three_months_ago)
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    if not recent:
        return []  # No data yet

    avg_high = sum(r.high for r in recent) / len(recent)
    avg_medium = sum(r.medium for r in recent) / len(recent)
    avg_low = sum(r.low for r in recent) / len(recent)

    next_month_date = datetime.now(timezone.utc) + timedelta(days=30)
    next_month = f"{next_month_date.year}-{next_month_date.month:02d}"

    forecast = ForecastItem(
        month=next_month,
        predicted_high=round(avg_high),
        predicted_medium=round(avg_medium),
        predicted_low=round(avg_low),
    )
    return [forecast]