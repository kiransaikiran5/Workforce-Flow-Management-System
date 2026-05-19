# app/routes/admin_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date, timedelta
from typing import Optional

from app.db.database import get_db
from app.models.employee_model import Employee
from app.models.user_model import User
from app.models.audit_log_model import AuditLog
from app.models.email_log import EmailLog
from app.models.leave_request import LeaveRequest
from app.models.attendance_model import Attendance       # ✅ Correct model name
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


# ─────────────────────────────────────────────────────
# ✅ ADMIN DASHBOARD (main)
# ─────────────────────────────────────────────────────
@router.get("/dashboard")
def admin_dashboard(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    # ---- Base employee query (with optional filters) ----
    emp_query = db.query(Employee)
    if department:
        emp_query = emp_query.filter(Employee.department == department)
    if date_from:
        emp_query = emp_query.filter(Employee.date_joined >= date_from)
    if date_to:
        emp_query = emp_query.filter(Employee.date_joined <= date_to)

    # ---- Existing stats ----
    total_employees = emp_query.count()
    active_users = db.query(User).filter(User.is_active == True).count()

    dept_counts = (
        emp_query
        .with_entities(Employee.department, func.count(Employee.id))
        .group_by(Employee.department)
        .all()
    )
    departments = [{"department": d, "count": c} for d, c in dept_counts]

    six_months_ago = date.today() - timedelta(days=180)
    if not date_from and not date_to:
        new_hires = db.query(Employee).filter(
            Employee.date_joined >= six_months_ago
        ).count()
        trend_data = (
            db.query(
                func.date_trunc('month', Employee.date_joined).label('month'),
                func.count(Employee.id)
            )
            .filter(Employee.date_joined >= six_months_ago)
            .group_by('month')
            .order_by('month')
            .all()
        )
        monthly_trend = [{"month": str(m), "count": c} for m, c in trend_data]
    else:
        new_hires = total_employees
        monthly_trend = []

    avg_salary_data = []
    try:
        avg_salary = (
            emp_query
            .filter(Employee.salary.isnot(None))
            .with_entities(Employee.department, func.avg(Employee.salary).label("avg_salary"))
            .group_by(Employee.department)
            .all()
        )
        avg_salary_data = [{"department": d, "avg_salary": round(s or 0, 2)} for d, s in avg_salary]
    except Exception:
        pass

    total_salary = 0
    try:
        total_salary = emp_query.filter(Employee.salary.isnot(None))\
            .with_entities(func.sum(Employee.salary)).scalar() or 0
    except Exception:
        pass

    # ---- Tenure ----
    year_diff = func.extract('year', func.age(func.current_date(), Employee.date_joined))
    tenure_expr = case(
        (year_diff < 1, "0-1 year"),
        (year_diff < 3, "1-3 years"),
        (year_diff < 5, "3-5 years"),
        else_="5+ years"
    )
    tenure_query = (
        emp_query.filter(Employee.date_joined.isnot(None))
        .with_entities(tenure_expr.label("tenure_label"), func.count(Employee.id))
        .group_by("tenure_label")
        .all()
    )
    tenure_data = [{"tenure": t, "count": c} for t, c in tenure_query]

    # ----------------------------------------------------------
    # ✅ NEW WORKFORCE STATS (attendance & leave)
    # ----------------------------------------------------------
    today = date.today()

    # Attendance: present today (using Attendance model)
    att_query = db.query(Attendance).join(Employee, Attendance.employee_id == Employee.id)
    if department:
        att_query = att_query.filter(Employee.department == department)

    present_today = att_query.filter(
        Attendance.date == today,
        Attendance.status == "present"
    ).count()

    # Leave: approved leave requests covering today
    leave_query = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id)
    if department:
        leave_query = leave_query.filter(Employee.department == department)

    on_leave = leave_query.filter(
        LeaveRequest.start_date <= today,
        LeaveRequest.end_date >= today,
        LeaveRequest.status == "approved"
    ).count()

    # Pending leave approvals (all)
    pending_approvals = db.query(LeaveRequest).filter(
        LeaveRequest.status == "pending"
    ).count()

    # Attendance summary for last 7 days (for bar chart)
    attendance_summary = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_query = db.query(Attendance).filter(Attendance.date == d)
        if department:
            day_query = day_query.join(Employee, Attendance.employee_id == Employee.id)\
                                 .filter(Employee.department == department)
        present = day_query.filter(Attendance.status == "present").count()
        absent = day_query.filter(Attendance.status == "absent").count()
        attendance_summary.append({"date": d.isoformat(), "present": present, "absent": absent})

    # Leave summary by type (for pie chart)
    leave_type_query = db.query(LeaveRequest.leave_type, func.count(LeaveRequest.id))\
                         .filter(LeaveRequest.status == "approved")
    if department:
        leave_type_query = leave_type_query.join(Employee, LeaveRequest.employee_id == Employee.id)\
                                            .filter(Employee.department == department)
    leave_types = leave_type_query.group_by(LeaveRequest.leave_type).all()
    leave_summary = [{"type": t, "value": c} for t, c in leave_types]

    # ----------------------------------------------------------
    return {
        "total_employees": total_employees,
        "active_users": active_users,
        "departments": departments,
        "new_hires": new_hires,
        "monthly_trend": monthly_trend,
        "avg_salary_per_dept": avg_salary_data,
        "total_salary": total_salary,
        "tenure_distribution": tenure_data,

        # New workforce stats
        "present_today": present_today,
        "on_leave": on_leave,
        "pending_approvals": pending_approvals,
        "attendance_summary": attendance_summary,
        "leave_summary": leave_summary,
    }


# ─────────────────────────────────────────────────────
# ✅ ATTENDANCE SUMMARY (standalone)
# ─────────────────────────────────────────────────────
@router.get("/attendance/summary")
def attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    today = date.today()
    records = db.query(Attendance).filter(Attendance.date == today).all()
    checked_in = len([r for r in records if r.check_in is not None])
    return {
        "today": today.isoformat(),
        "total_records": len(records),
        "checked_in": checked_in,
        "records": [
            {
                "id": r.id,
                "employee_id": r.employee_id,
                "check_in": r.check_in.isoformat() if r.check_in else None,
                "check_out": r.check_out.isoformat() if r.check_out else None,
            }
            for r in records
        ]
    }


# ─────────────────────────────────────────────────────
# ✅ LEAVE SUMMARY (standalone)
# ─────────────────────────────────────────────────────
@router.get("/leave/summary")
def leave_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    pending = db.query(LeaveRequest).filter(LeaveRequest.status == "pending").count()
    approved = db.query(LeaveRequest).filter(LeaveRequest.status == "approved").count()
    rejected = db.query(LeaveRequest).filter(LeaveRequest.status == "rejected").count()
    return {
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
    }


# ─────────────────────────────────────────────────────
# ✅ LIST ALL USERS
# ─────────────────────────────────────────────────────
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active if hasattr(u, 'is_active') else True,
        }
        for u in users
    ]


# ─────────────────────────────────────────────────────
# ✅ UPDATE USER ROLE
# ─────────────────────────────────────────────────────
@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if role not in ("admin", "employee", "hr"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = role
    db.commit()
    return {"success": True, "user_id": user.id, "new_role": role}


# ─────────────────────────────────────────────────────
# ✅ RECENT ACTIVITY
# ─────────────────────────────────────────────────────
@router.get("/recent-activity")
def get_recent_activity(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "user": log.performed_by,
            "action": log.action,
            "target": log.target,
            "details": log.details,
            "timestamp": log.created_at.isoformat(),
        }
        for log in logs
    ]


# ─────────────────────────────────────────────────────
# ✅ EMAIL LOGS
# ─────────────────────────────────────────────────────
@router.get("/email-logs")
def get_email_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin","hr"))
):
    logs = db.query(EmailLog).order_by(EmailLog.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(EmailLog).count()
    return {"data": logs, "total": total, "skip": skip, "limit": limit}