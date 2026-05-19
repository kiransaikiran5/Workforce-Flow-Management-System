from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from app.db.database import get_db
from app.models.attrition_prediction import AttritionPrediction
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/forecast", tags=["Forecast Enhanced"])

# ── Helper: linear regression forecast ──────────────────
def linear_forecast(historical: list, periods: int) -> list:
    if len(historical) < 2:
        return [historical[-1][1]] * periods if historical else [0] * periods

    xs = np.array([h[0] for h in historical])
    ys = np.array([h[1] for h in historical])
    coeffs = np.polyfit(xs, ys, 1)
    last_index = xs[-1]
    forecast = []
    for i in range(1, periods + 1):
        forecast.append(round(float(np.polyval(coeffs, last_index + i)), 2))
    return forecast

# ── 1. Long‑term monthly forecast ──────────────────────
@router.get("/long-term")
def long_term_forecast(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
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
        history.append({
            "month": month_str,
            "total": r.total,
            "high": r.high,
            "medium": r.medium,
            "low": r.low
        })

    indices = list(range(len(history)))
    high_vals = [h["high"] for h in history]
    medium_vals = [h["medium"] for h in history]
    low_vals = [h["low"] for h in history]

    high_forecast = linear_forecast(list(zip(indices, high_vals)), months)
    medium_forecast = linear_forecast(list(zip(indices, medium_vals)), months)
    low_forecast = linear_forecast(list(zip(indices, low_vals)), months)

    last_date = datetime.now(timezone.utc)
    forecast_items = []
    for i in range(months):
        next_date = last_date + timedelta(days=30 * (i + 1))
        month_str = next_date.strftime('%Y-%m')
        forecast_items.append({
            "month": month_str + " (F)",
            "high": max(0, round(high_forecast[i])),
            "medium": max(0, round(medium_forecast[i])),
            "low": max(0, round(low_forecast[i]))
        })

    return {"historical": history, "forecast": forecast_items}

# ── 2. Yearly trend analysis ──────────────────────────
@router.get("/yearly-trend")
def yearly_trend(
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    results = (
        db.query(
            extract('year', AttritionPrediction.predicted_at).label('year'),
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
        .group_by('year')
        .order_by('year')
        .all()
    )
    return [
        {"year": int(r.year), "total": r.total, "high": r.high, "medium": r.medium, "low": r.low}
        for r in results
    ]

# ── 3. Year‑over‑year comparison ──────────────────────
@router.get("/comparison")
def year_comparison(
    year1: int = Query(...),
    year2: int = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    def get_year_stats(year: int):
        stats = (
            db.query(
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
            .filter(extract('year', AttritionPrediction.predicted_at) == year)
            .first()
        )
        if not stats or stats.total == 0:
            return None
        return {"year": year, "total": stats.total, "high": stats.high, "medium": stats.medium, "low": stats.low}

    y1 = get_year_stats(year1)
    y2 = get_year_stats(year2)
    return {"year1": y1, "year2": y2}