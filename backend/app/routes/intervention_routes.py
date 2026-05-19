from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.hr_intervention import HRIntervention
from app.models.employee_feedback import EmployeeFeedback
from app.models.employee_model import Employee
from app.models.user_model import User
from app.schemas.prediction_schema import (
    HRInterventionOut, HRInterventionCreate, HRInterventionUpdate,
    EmployeeFeedbackOut, EmployeeFeedbackCreate
)
from app.utils.dependencies import get_current_user, require_roles
from app.utils.activity_logger import log_activity

router = APIRouter(prefix="/interventions", tags=["Interventions"])

@router.get("/", response_model=List[HRInterventionOut])
def list_interventions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    interventions = (
        db.query(HRIntervention)
        .join(Employee, HRIntervention.employee_id == Employee.id)
        .join(User, HRIntervention.hr_user_id == User.id)
        .order_by(HRIntervention.created_at.desc())
        .all()
    )
    result = []
    for i in interventions:
        result.append(HRInterventionOut(
            id=i.id,
            employee_id=i.employee_id,
            hr_user_id=i.hr_user_id,
            action_type=i.action_type,
            status=i.status,
            notes=i.notes,
            created_at=i.created_at,
            updated_at=i.updated_at,
            employee_name=i.employee.name if i.employee else None,
            hr_name=i.hr_user.name if i.hr_user else None,
        ))
    return result

@router.post("/", response_model=HRInterventionOut)
def create_intervention(
    payload: HRInterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    intervention = HRIntervention(
        employee_id=payload.employee_id,
        hr_user_id=current_user.id,
        action_type=payload.action_type,
        status=payload.status,
        notes=payload.notes
    )
    db.add(intervention)
    db.commit()
    db.refresh(intervention)

    emp = db.query(Employee).get(intervention.employee_id)
    hr = db.query(User).get(intervention.hr_user_id)

    # Activity log (fixed)
    log_activity(
        db=db,
        user_email=current_user.email,
        action="Created Intervention",
        module="Intervention",
        details=f"Target: {emp.name if emp else intervention.employee_id} | Type: {intervention.action_type}, Status: {intervention.status}"
    )

    return HRInterventionOut(
        id=intervention.id,
        employee_id=intervention.employee_id,
        hr_user_id=intervention.hr_user_id,
        action_type=intervention.action_type,
        status=intervention.status,
        notes=intervention.notes,
        created_at=intervention.created_at,
        updated_at=intervention.updated_at,
        employee_name=emp.name if emp else None,
        hr_name=hr.name if hr else None,
    )

@router.put("/{intervention_id}", response_model=HRInterventionOut)
def update_intervention(
    intervention_id: int,
    payload: HRInterventionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    intervention = db.query(HRIntervention).get(intervention_id)
    if not intervention:
        raise HTTPException(404, "Intervention not found")

    old_status = intervention.status

    if payload.action_type is not None:
        intervention.action_type = payload.action_type
    if payload.status is not None:
        intervention.status = payload.status
    if payload.notes is not None:
        intervention.notes = payload.notes

    db.commit()
    db.refresh(intervention)

    emp = db.query(Employee).get(intervention.employee_id)
    hr = db.query(User).get(intervention.hr_user_id)

    # Activity log (fixed)
    if payload.status is not None:
        log_activity(
            db=db,
            user_email=current_user.email,
            action="Updated Intervention",
            module="Intervention",
            details=f"Target ID: {intervention.employee_id} | Status changed from {old_status} to {intervention.status}"
        )

    return HRInterventionOut(
        id=intervention.id,
        employee_id=intervention.employee_id,
        hr_user_id=intervention.hr_user_id,
        action_type=intervention.action_type,
        status=intervention.status,
        notes=intervention.notes,
        created_at=intervention.created_at,
        updated_at=intervention.updated_at,
        employee_name=emp.name if emp else None,
        hr_name=hr.name if hr else None,
    )

# --- Feedback endpoints (unchanged) ---
@router.post("/feedback", response_model=EmployeeFeedbackOut)
def add_feedback(
    payload: EmployeeFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    intervention = db.query(HRIntervention).get(payload.intervention_id)
    if not intervention:
        raise HTTPException(404, "Intervention not found")

    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(403, "No employee profile linked to your account")

    if employee.id != intervention.employee_id:
        raise HTTPException(403, "You can only provide feedback for your own intervention")

    feedback = EmployeeFeedback(
        intervention_id=payload.intervention_id,
        employee_id=employee.id,
        feedback_text=payload.feedback_text
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return EmployeeFeedbackOut(
        id=feedback.id,
        intervention_id=feedback.intervention_id,
        employee_id=feedback.employee_id,
        feedback_text=feedback.feedback_text,
        created_at=feedback.created_at,
        employee_name=employee.name,
    )

@router.get("/{intervention_id}/feedback", response_model=List[EmployeeFeedbackOut])
def get_intervention_feedback(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr", "employee"))
):
    feedbacks = (
        db.query(EmployeeFeedback)
        .filter(EmployeeFeedback.intervention_id == intervention_id)
        .order_by(EmployeeFeedback.created_at.asc())
        .all()
    )
    result = []
    for fb in feedbacks:
        emp = db.query(Employee).get(fb.employee_id)
        result.append(EmployeeFeedbackOut(
            id=fb.id,
            intervention_id=fb.intervention_id,
            employee_id=fb.employee_id,
            feedback_text=fb.feedback_text,
            created_at=fb.created_at,
            employee_name=emp.name if emp else None,
        ))
    return result