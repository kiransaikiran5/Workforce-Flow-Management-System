from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.utils.dependencies import get_current_user

from app.models.employee_model import Employee
from app.models.attendance_model import Attendance
from app.models.leave_model import Leave
from app.models.task_model import Task

router = APIRouter()


# =====================================================
# STANDARD RESPONSE
# =====================================================
def success_response(data=None, message="Success"):
    return {
        "success": True,
        "message": message,
        "data": data
    }


# =====================================================
# EMPLOYEE DASHBOARD
# =====================================================
@router.get("/dashboard")
def get_employee_dashboard(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    # =================================================
    # GET EMPLOYEE
    # =================================================
    employee = db.query(Employee).filter(
        Employee.user_id == user.id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # =================================================
    # ATTENDANCE
    # =================================================
    total_days = db.query(
        func.count(Attendance.id)
    ).filter(
        Attendance.employee_id == employee.id
    ).scalar() or 0

    present_days = db.query(
        func.count(Attendance.id)
    ).filter(
        Attendance.employee_id == employee.id,
        Attendance.status == "present"
    ).scalar() or 0

    attendance_percent = (
        (present_days / total_days) * 100
        if total_days > 0 else 0
    )

    # =================================================
    # LEAVES
    # =================================================
    total_leaves = db.query(
        func.coalesce(func.sum(Leave.days), 0)
    ).filter(
        Leave.employee_id == employee.id
    ).scalar() or 0

    # =================================================
    # TASKS
    # =================================================
    total_tasks = db.query(
        func.count(Task.id)
    ).filter(
        Task.employee_id == employee.id
    ).scalar() or 0

    completed_tasks = db.query(
        func.count(Task.id)
    ).filter(
        Task.employee_id == employee.id,
        Task.status == "done"
    ).scalar() or 0

    # =================================================
    # ACTIVITIES
    # =================================================
    recent_tasks = db.query(Task).filter(
        Task.employee_id == employee.id
    ).order_by(
        Task.id.desc()
    ).limit(5).all()

    activities = []

    for task in recent_tasks:

        activities.append({
            "message":
            f"Task '{task.title}' status updated to '{task.status}'"
        })

    # =================================================
    # FINAL RESPONSE
    # =================================================
    return success_response({

        "employee": {

            "id": employee.id,

            "name": employee.name or "N/A",

            "email": employee.email or "N/A",

            "department":
            employee.department or "Not Assigned",

            "designation":
            employee.designation or "Employee",

            "system_role":
            employee.system_role or "employee",

            "phone":
            employee.phone or "",

            "address":
            employee.address or "",
        },

        "attendance": {
            "percentage": round(attendance_percent, 2),
            "present_days": present_days,
            "total_days": total_days,
        },

        "leaves": {
            "total": total_leaves,
            "remaining": max(12 - total_leaves, 0),
        },

        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": total_tasks - completed_tasks,
        },

        "activities": activities

    })
