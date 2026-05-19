from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class PredictionResult(BaseModel):
    id: int
    employee_id: Optional[int]
    identifier: str
    risk_score: float
    risk_percentage: float      # risk_score * 100
    confidence_score: float     # 0–100 scale
    risk_category: str
    predicted_at: datetime
    employee_name: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True

class PredictionSummary(BaseModel):
    total: int
    high: int
    medium: int
    low: int

class DepartmentSummary(BaseModel):
    department: str
    total: int
    high_risk: int
    medium_risk: int
    low_risk: int

# New schemas for trend / forecast
class MonthlyTrendItem(BaseModel):
    month: str             # e.g. "2026-01"
    total: int
    high: int
    medium: int
    low: int

class ForecastItem(BaseModel):
    month: str
    predicted_high: int
    predicted_medium: int
    predicted_low: int
    
class TurnoverStats(BaseModel):
    department: str
    total_employees: int
    high_risk_count: int
    actual_turnover: int      # simulated
    turnover_rate: float       # percentage

class TopHighRiskEmployee(BaseModel):
    employee_name: Optional[str]
    identifier: str
    department: Optional[str]
    risk_score: float
    risk_percentage: float
    confidence_score: float
    risk_category: str

class YearlySummary(BaseModel):
    year: int
    total: int
    high: int
    medium: int
    low: int

class HeatmapItem(BaseModel):
    department: str
    high: int
    medium: int
    low: int
    total: int

class AnalyticsResponse(BaseModel):
    turnover_stats: List[TurnoverStats]
    top_high_risk: List[TopHighRiskEmployee]
    yearly_summary: List[YearlySummary]
    heatmap: List[HeatmapItem]
    department_trend: List[DepartmentSummary]   # reuse existing DepartmentSummary
    
# === Monitoring schemas ===
class HighRiskAlertOut(BaseModel):
    id: int
    employee_id: Optional[int]
    prediction_id: Optional[int]
    alert_type: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class RiskChangeLogOut(BaseModel):
    id: int
    employee_id: Optional[int]
    previous_risk_score: Optional[float]
    new_risk_score: float
    previous_category: Optional[str]
    new_category: str
    change_type: str
    created_at: datetime

    class Config:
        from_attributes = True
        
class NotificationPreferenceOut(BaseModel):
    id: int
    user_id: int
    email_high_risk_alerts: bool
    email_weekly_summary: bool

    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    email_high_risk_alerts: Optional[bool] = None
    email_weekly_summary: Optional[bool] = None
    
class HRInterventionOut(BaseModel):
    id: int
    employee_id: int
    hr_user_id: int
    action_type: str
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    hr_name: Optional[str] = None

    class Config:
        from_attributes = True

class HRInterventionCreate(BaseModel):
    employee_id: int
    action_type: str
    status: str = "planned"
    notes: Optional[str] = None

class HRInterventionUpdate(BaseModel):
    action_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class EmployeeFeedbackOut(BaseModel):
    id: int
    intervention_id: int
    employee_id: int
    feedback_text: str
    created_at: datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True

class EmployeeFeedbackCreate(BaseModel):
    intervention_id: int
    feedback_text: str