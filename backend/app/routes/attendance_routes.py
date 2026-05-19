from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, date, time, timezone

from app.db.database import get_db
from app.models.employee_model import Employee
from app.models.attendance_model import Attendance
from app.models.notification_model import Notification
from app.utils.dependencies import get_current_user, require_roles
from app.utils.activity_logger import log_activity   # ✅ unified logger

router = APIRouter()


# =====================================================
# ✅ STANDARD RESPONSE
# =====================================================
def success_response(data=None, message="Success"):
    return {
        "success": True,
        "message": message,
        "data": data
    }


# =====================================================
# ✅ GET EMPLOYEE BY USER
# =====================================================
def get_employee_by_user(db: Session, user):
    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


# =====================================================
# ✅ CHECK IN
# =====================================================
@router.post("/check-in")
def check_in(db: Session = Depends(get_db), user=Depends(get_current_user)):
    employee = get_employee_by_user(db, user)
    today = date.today()

    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today
    ).first()

    if attendance and attendance.check_in:
        raise HTTPException(status_code=400, detail="Already checked in today")

    current_time = datetime.now(timezone.utc)          # ✅ timezone‑aware

    if not attendance:
        attendance = Attendance(
            employee_id=employee.id,
            date=today,
            status="present",
            check_in=current_time
        )
        db.add(attendance)
    else:
        attendance.check_in = current_time
        attendance.status = "present"

    # Late mark
    office_time = time(9, 30)
    if current_time.time() > office_time:
        attendance.is_late = True
    else:
        attendance.is_late = False

    # Notification
    notif = Notification(
        message=f"{employee.name} checked in",
        user_email=user.email,
        target_email=user.email,
        type="attendance"
    )
    db.add(notif)

    db.commit()

    # ✅ Log activity – will appear in live feed
    log_activity(
        db=db,
        user_email=user.email,
        action="Check In",
        module="Attendance",
        details=f"{employee.name} checked in"
    )

    return success_response(
        {"check_in": current_time, "late": attendance.is_late},
        "Checked in successfully"
    )


# =====================================================
# ✅ CHECK OUT
# =====================================================
@router.post("/check-out")
def check_out(db: Session = Depends(get_db), user=Depends(get_current_user)):
    employee = get_employee_by_user(db, user)
    today = date.today()

    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today
    ).first()

    if not attendance:
        raise HTTPException(status_code=400, detail="Please check in first")
    if attendance.check_out:
        raise HTTPException(status_code=400, detail="Already checked out")

    current_time = datetime.now(timezone.utc)
    attendance.check_out = current_time

    # Work hours calculation – handle naive datetime from legacy data
    if attendance.check_in:
        check_in = attendance.check_in
        # Make naive check_in timezone‑aware (assume UTC if missing tzinfo)
        if check_in.tzinfo is None:
            check_in = check_in.replace(tzinfo=timezone.utc)

        check_out_time = attendance.check_out   # always aware

        diff = check_out_time - check_in
        hours = diff.total_seconds() / 3600
        attendance.work_hours = round(hours, 2)

        if attendance.work_hours > 8:
            attendance.overtime_hours = round(attendance.work_hours - 8, 2)
        else:
            attendance.overtime_hours = 0

    # Day status
    if attendance.work_hours >= 8:
        attendance.day_status = "full_day"
    elif attendance.work_hours >= 4:
        attendance.day_status = "half_day"
    else:
        attendance.day_status = "short_hours"

    db.commit()

    # Log activity
    log_activity(
        db=db,
        user_email=user.email,
        action="Check Out",
        module="Attendance",
        details=f"{employee.name} worked {attendance.work_hours} hours, overtime {attendance.overtime_hours} hours"
    )

    return success_response(
        {
            "work_hours": attendance.work_hours,
            "overtime_hours": attendance.overtime_hours,
            "day_status": attendance.day_status
        },
        "Checked out successfully"
    )

# =====================================================
# ✅ MARK ABSENT
# =====================================================
@router.post("/mark-absent")
def mark_absent(data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    employee = get_employee_by_user(db, user)
    today = date.today()

    existing = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Attendance already exists")

    attendance = Attendance(
        employee_id=employee.id,
        date=today,
        status="absent",
        leave_reason=data.get("reason"),
        day_status="leave"
    )
    db.add(attendance)

    # Notification
    notif = Notification(
        message=f"{employee.name} marked absent",
        user_email=user.email,
        target_email=user.email,
        type="leave"
    )
    db.add(notif)

    db.commit()

    # ✅ Log activity
    log_activity(
        db=db,
        user_email=user.email,
        action="Marked Absent",
        module="Attendance",
        details=f"{employee.name} marked absent" + (f" – {data.get('reason')}" if data.get("reason") else "")
    )

    return success_response(message="Absent marked successfully")


# =====================================================
# ✅ MY ATTENDANCE
# =====================================================
@router.get("/my-attendance")
def get_my_attendance(db: Session = Depends(get_db), user=Depends(get_current_user)):
    employee = get_employee_by_user(db, user)

    records = db.query(Attendance).filter(
        Attendance.employee_id == employee.id
    ).order_by(Attendance.date.desc()).all()

    return success_response(records)


# =====================================================
# ✅ ADMIN / hr ALL ATTENDANCE
# =====================================================
@router.get("/all")
def get_all_attendance(
    status: str = Query(None),
    department: str = Query(None),
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "hr"))
):
    query = db.query(Attendance, Employee).join(
        Employee, Employee.id == Attendance.employee_id
    )

    if status:
        query = query.filter(Attendance.status == status)
    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))

    results = query.order_by(Attendance.date.desc()).all()

    data = []
    for attendance, employee in results:
        data.append({
            "employee_name": employee.name,
            "department": employee.department,
            "designation": employee.designation,
            "date": attendance.date,
            "status": attendance.status,
            "check_in": attendance.check_in,
            "check_out": attendance.check_out,
            "work_hours": attendance.work_hours,
            "overtime_hours": attendance.overtime_hours,
            "late": attendance.is_late,
            "day_status": attendance.day_status,
            "leave_reason": attendance.leave_reason
        })

    return success_response(data)


# =====================================================
# ✅ ATTENDANCE ANALYTICS
# =====================================================
@router.get("/analytics")
def attendance_analytics(
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "hr"))
):
    records = db.query(Attendance).all()

    total = len(records)
    present = len([r for r in records if r.status == "present"])
    absent = len([r for r in records if r.status == "absent"])
    late = len([r for r in records if getattr(r, "is_late", False)])
    overtime = sum([r.overtime_hours or 0 for r in records])

    return success_response({
        "total_records": total,
        "present_count": present,
        "absent_count": absent,
        "late_count": late,
        "total_overtime_hours": overtime
    })