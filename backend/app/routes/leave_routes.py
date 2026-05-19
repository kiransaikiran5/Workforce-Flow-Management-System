# app/routes/leave_routes.py

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.employee_model import Employee
from app.models.leave_request import LeaveRequest
from app.models.user_model import User
from app.models.notification_model import Notification

from app.utils.dependencies import (
    get_current_user,
    require_roles
)

from app.utils.email_service import (
    send_leave_applied_email,
    send_leave_status_change_email
)

from app.utils.activity_logger import log_activity   # ← unified logger

router = APIRouter()


# =========================================================
# Pydantic Model
# =========================================================

class LeaveApplyRequest(BaseModel):

    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None

    @validator("end_date")
    def ensure_dates_order(cls, v, values):
        if "start_date" in values:
            if v < values["start_date"]:
                raise ValueError("end_date must be after start_date")
        return v


# =========================================================
# Serializer
# =========================================================

def _serialize(req: LeaveRequest):
    return {
        "id": req.id,
        "employee_id": req.employee_id,
        "leave_type": req.leave_type,
        "start_date": req.start_date.isoformat(),
        "end_date": req.end_date.isoformat(),
        "reason": req.reason,
        "status": req.status,
        "created_at": req.created_at.isoformat() if req.created_at else None
    }


# =========================================================
# 1. APPLY LEAVE
# =========================================================

@router.post("/apply")
def apply_leave(
    payload: LeaveApplyRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee record not found")

    # Create Leave Request
    req = LeaveRequest(
        employee_id=emp.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status="pending"
    )

    db.add(req)
    db.commit()
    db.refresh(req)

    # -----------------------------------------------
    # ✅ Log activity – will show in live feed
    # -----------------------------------------------
    log_activity(
        db=db,
        user_email=current_user.email,
        action="Applied Leave",
        module="Leave",
        details=f"{emp.name} applied for {payload.leave_type} leave"
    )

    # Send email to employee
    send_leave_applied_email(
        db=db,
        email=current_user.email,
        name=emp.name,
        leave_type=req.leave_type,
        start_date=str(req.start_date),
        end_date=str(req.end_date),
        reason=req.reason or "",
        background_tasks=background_tasks
    )

    # Notify admin / HR / manager
    admin_hr_users = db.query(User).filter(
        User.role.in_(["admin", "hr"])
    ).all()

    for user in admin_hr_users:
        notif = Notification(
            user_email=user.email,
            target_email=user.email,
            message=f"{emp.name} applied for {payload.leave_type} leave",
            type="leave"
        )
        db.add(notif)

    db.commit()

    return {
        "success": True,
        "message": "Leave request submitted",
        "request_id": req.id
    }


# =========================================================
# 2. MY REQUESTS
# =========================================================

@router.get("/my-requests")
def my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not emp:
        return []

    requests = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == emp.id
    ).order_by(
        LeaveRequest.created_at.desc()
    ).all()

    return [_serialize(r) for r in requests]


# =========================================================
# 3. PENDING REQUESTS
# =========================================================

@router.get("/pending")
def pending_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    requests = db.query(LeaveRequest).filter(
        LeaveRequest.status == "pending"
    ).order_by(
        LeaveRequest.created_at.desc()
    ).all()

    return [_serialize(r) for r in requests]


# =========================================================
# 4. APPROVE LEAVE
# =========================================================

@router.put("/{req_id}/approve")
def approve_leave(
    req_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id == req_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Leave already {req.status}")

    req.status = "approved"

    # Find employee
    employee = db.query(Employee).filter(
        Employee.id == req.employee_id
    ).first()

    employee_user = None
    if employee:
        employee_user = db.query(User).filter(
            User.id == employee.user_id
        ).first()

    db.commit()

    # -----------------------------------------------
    # ✅ Log activity
    # -----------------------------------------------
    log_activity(
        db=db,
        user_email=current_user.email,
        action="Approved Leave",
        module="Leave",
        details=f"Approved {req.leave_type} leave for {employee.name if employee else 'employee'}"
    )

    # Send email & notify employee
    if employee and employee_user:
        send_leave_status_change_email(
            db=db,
            email=employee_user.email,
            name=employee.name,
            leave_type=req.leave_type,
            start_date=str(req.start_date),
            end_date=str(req.end_date),
            status="approved",
            background_tasks=background_tasks
        )

        notif = Notification(
            user_email=employee_user.email,
            target_email=employee_user.email,
            message=f"Your {req.leave_type} leave has been approved",
            type="leave"
        )
        db.add(notif)
        db.commit()

    return {"success": True, "message": "Leave approved"}


# =========================================================
# 5. REJECT LEAVE
# =========================================================

@router.put("/{req_id}/reject")
def reject_leave(
    req_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    req = db.query(LeaveRequest).filter(
        LeaveRequest.id == req_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if req.status != "pending":
        raise HTTPException(status_code=400, detail=f"Leave already {req.status}")

    req.status = "rejected"

    # Find employee
    employee = db.query(Employee).filter(
        Employee.id == req.employee_id
    ).first()

    employee_user = None
    if employee:
        employee_user = db.query(User).filter(
            User.id == employee.user_id
        ).first()

    db.commit()

    # -----------------------------------------------
    # ✅ Log activity
    # -----------------------------------------------
    log_activity(
        db=db,
        user_email=current_user.email,
        action="Rejected Leave",
        module="Leave",
        details=f"Rejected {req.leave_type} leave for {employee.name if employee else 'employee'}"
    )

    # Send email & notify employee
    if employee and employee_user:
        send_leave_status_change_email(
            db=db,
            email=employee_user.email,
            name=employee.name,
            leave_type=req.leave_type,
            start_date=str(req.start_date),
            end_date=str(req.end_date),
            status="rejected",
            background_tasks=background_tasks
        )

        notif = Notification(
            user_email=employee_user.email,
            target_email=employee_user.email,
            message=f"Your {req.leave_type} leave has been rejected",
            type="leave"
        )
        db.add(notif)
        db.commit()

    return {"success": True, "message": "Leave rejected"}