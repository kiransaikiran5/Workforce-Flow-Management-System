from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone
from typing import Optional
import pandas as pd
import io

from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet

from app.db.database import get_db
from app.models.employee_model import Employee
from app.models.attendance_model import Attendance
from app.models.leave_request import LeaveRequest
from app.models.audit_log_model import AuditLog
from app.models.user_model import User
from app.utils.dependencies import get_current_user, require_role

router = APIRouter()


# ─────────────────────────────────────────────────
# Role‑check helper (supports multiple roles)
# ─────────────────────────────────────────────────
def require_roles(*roles):
    def role_dependency(user: User = Depends(get_current_user)):
        if user.role not in roles and user.role != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_dependency


# ─────────────────────────────────────────────────
# Audit log helper
# ─────────────────────────────────────────────────
def log_export(db: Session, user_email: str, action: str, details: str = ""):
    audit = AuditLog(
        performed_by=user_email,
        action=action,
        target="Report",
        details=details
    )
    db.add(audit)
    db.commit()


# ─────────────────────────────────────────────────
# Excel / PDF builders (reusable)
# ─────────────────────────────────────────────────
def build_excel(dataframe: pd.DataFrame, sheet_name: str = "Report") -> io.BytesIO:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        dataframe.to_excel(writer, index=False, sheet_name=sheet_name)
        ws = writer.sheets[sheet_name]
        for column_cells in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in column_cells)
            ws.column_dimensions[column_cells[0].column_letter].width = min(max_len + 3, 50)
    output.seek(0)
    return output


def build_pdf(title: str, metadata: str, header: list, rows: list) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=40, bottomMargin=50,
                            leftMargin=40, rightMargin=40)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(title, styles["Title"]),
        Spacer(1, 12),
        Paragraph(metadata, styles["Normal"]),
        Spacer(1, 24),
    ]

    data = [header] + rows
    col_width = 400 // len(header) if len(header) > 0 else 100
    table = Table(data, colWidths=[max(60, col_width)] * len(header))
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f2f2")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]))
    elements.append(table)

    def page_footer(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(letter[0] / 2, 25, f"Page {doc_obj.page}")
        canvas.restoreState()

    doc.build(elements, onFirstPage=page_footer, onLaterPages=page_footer)
    buffer.seek(0)
    return buffer


# ─────────────────────────────────────────────────
# Employee filters (shared)
# ─────────────────────────────────────────────────
def get_filtered_employees(
    db: Session,
    department: Optional[str] = None,
    designation: Optional[str] = None,
    system_role: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))
    if designation:
        query = query.filter(Employee.designation.ilike(f"%{designation}%"))
    if system_role:
        query = query.filter(Employee.system_role.ilike(f"%{system_role}%"))
    if search:
        query = query.filter(
            (Employee.name.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )
    if date_from:
        query = query.filter(Employee.date_joined >= date_from)
    if date_to:
        query = query.filter(Employee.date_joined <= date_to)
    return query.order_by(Employee.id.desc())


# ═══════════════════════════════════════════════
# EMPLOYEE REPORTS
# ═══════════════════════════════════════════════

@router.get("/data")
def get_employee_report_data(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    system_role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    query = get_filtered_employees(db, department, designation, system_role, search, date_from, date_to)
    total = query.count()
    employees = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for e in employees:
        result.append({
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "department": e.department or "",
            "designation": e.designation or "",
            "system_role": e.system_role or "",
            "date_joined": e.date_joined.isoformat() if e.date_joined else "",
            "phone": e.phone or "",
            "address": e.address or "",
        })

    return {
        "data": result,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/export/excel")
def export_employee_excel(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    system_role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    employees = get_filtered_employees(db, department, designation, system_role, search, date_from, date_to).all()
    if not employees:
        raise HTTPException(status_code=404, detail="No employees found")

    df = pd.DataFrame([{
        "Name": e.name,
        "Email": e.email,
        "Department": e.department,
        "Designation": e.designation,
        "Role": e.system_role,
        "Date Joined": e.date_joined.strftime("%Y-%m-%d") if e.date_joined else "",
        "Phone": e.phone or "",
        "Address": e.address or "",
    } for e in employees])

    output = build_excel(df, "Employees")
    log_export(db, user.email, "EXPORT_EMPLOYEE_EXCEL",
               f"Filters: department={department}, designation={designation}, role={system_role}, search={search}, from={date_from}, to={date_to}")
    filename = f"employee_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/pdf")
def export_employee_pdf(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    system_role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    employees = get_filtered_employees(db, department, designation, system_role, search, date_from, date_to).all()
    if not employees:
        raise HTTPException(status_code=404, detail="No employees found")

    header = ["Name", "Department", "Designation", "Role", "Date Joined"]
    rows = [[
        e.name,
        e.department or "—",
        e.designation or "—",
        e.system_role or "—",
        e.date_joined.strftime("%Y-%m-%d") if e.date_joined else "",
    ] for e in employees]

    title = "Employee Report"
    metadata = f"<b>Generated by:</b> {user.email}<br/><b>Date:</b> {datetime.now().strftime('%d %B %Y')}<br/><b>Total:</b> {len(employees)}"
    buffer = build_pdf(title, metadata, header, rows)
    log_export(db, user.email, "EXPORT_EMPLOYEE_PDF", metadata)
    filename = f"employee_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ═══════════════════════════════════════════════
# ATTENDANCE REPORTS
# ═══════════════════════════════════════════════

@router.get("/attendance/data")
def get_attendance_data(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    q = db.query(Attendance).join(Employee, Attendance.employee_id == Employee.id)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if status:
        q = q.filter(Attendance.status == status)
    q = q.order_by(Attendance.date.desc())

    total = q.count()
    records = q.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for a in records:
        emp = db.query(Employee).get(a.employee_id)
        emp_name = emp.name if emp else str(a.employee_id)
        result.append({
            "id": a.id,
            "employee_name": emp_name,
            "date": a.date.isoformat() if a.date else "",
            "check_in": str(a.check_in) if a.check_in else "",
            "check_out": str(a.check_out) if a.check_out else "",
            "status": a.status,
        })

    return {
        "data": result,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/attendance/export/excel")
def export_attendance_excel(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hrr"))
):
    q = db.query(Attendance).join(Employee)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if status:
        q = q.filter(Attendance.status == status)
    records = q.all()

    df = pd.DataFrame([{
        "Employee": (db.query(Employee).get(r.employee_id).name if db.query(Employee).get(r.employee_id) else r.employee_id),
        "Date": r.date,
        "Check In": r.check_in,
        "Check Out": r.check_out,
        "Status": r.status,
    } for r in records])

    output = build_excel(df, "Attendance")
    log_export(db, user.email, "EXPORT_ATTENDANCE_EXCEL",
               f"Filters: from={date_from}, to={date_to}, employee={employee_id}, status={status}")
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/attendance/export/pdf")
def export_attendance_pdf(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    q = db.query(Attendance).join(Employee)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if status:
        q = q.filter(Attendance.status == status)
    records = q.all()

    header = ["Employee", "Date", "Check In", "Check Out", "Status"]
    rows = []
    for r in records:
        emp = db.query(Employee).get(r.employee_id)
        emp_name = emp.name if emp else r.employee_id
        rows.append([
            emp_name,
            str(r.date),
            str(r.check_in) if r.check_in else "",
            str(r.check_out) if r.check_out else "",
            r.status,
        ])

    title = "Attendance Report"
    metadata = f"<b>Generated by:</b> {user.email}<br/><b>Date:</b> {datetime.now().strftime('%d %B %Y')}<br/><b>Total:</b> {len(records)}"
    buffer = build_pdf(title, metadata, header, rows)
    log_export(db, user.email, "EXPORT_ATTENDANCE_PDF", metadata)
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ═══════════════════════════════════════════════
# LEAVE REPORTS
# ═══════════════════════════════════════════════

@router.get("/leave/data")
def get_leave_data(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    leave_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    q = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.id)
    if date_from:
        q = q.filter(LeaveRequest.start_date >= date_from)
    if date_to:
        q = q.filter(LeaveRequest.end_date <= date_to)
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    q = q.order_by(LeaveRequest.created_at.desc())

    total = q.count()
    records = q.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for lv in records:
        emp = db.query(Employee).get(lv.employee_id)
        emp_name = emp.name if emp else str(lv.employee_id)
        result.append({
            "id": lv.id,
            "employee_name": emp_name,
            "leave_type": lv.leave_type,
            "start_date": lv.start_date.isoformat(),
            "end_date": lv.end_date.isoformat(),
            "status": lv.status,
            "reason": lv.reason or "",
        })

    return {
        "data": result,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/leave/export/excel")
def export_leave_excel(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    leave_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    q = db.query(LeaveRequest).join(Employee)
    if date_from:
        q = q.filter(LeaveRequest.start_date >= date_from)
    if date_to:
        q = q.filter(LeaveRequest.end_date <= date_to)
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    records = q.all()

    df = pd.DataFrame([{
        "Employee": (db.query(Employee).get(r.employee_id).name if db.query(Employee).get(r.employee_id) else r.employee_id),
        "Type": r.leave_type,
        "Start": r.start_date,
        "End": r.end_date,
        "Status": r.status,
        "Reason": r.reason or "",
    } for r in records])

    output = build_excel(df, "Leave")
    log_export(db, user.email, "EXPORT_LEAVE_EXCEL",
               f"Filters: type={leave_type}, status={status}, from={date_from}, to={date_to}")
    filename = f"leave_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/leave/export/pdf")
def export_leave_pdf(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    leave_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    q = db.query(LeaveRequest).join(Employee)
    if date_from:
        q = q.filter(LeaveRequest.start_date >= date_from)
    if date_to:
        q = q.filter(LeaveRequest.end_date <= date_to)
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    records = q.all()

    header = ["Employee", "Type", "Start", "End", "Status", "Reason"]
    rows = []
    for r in records:
        emp = db.query(Employee).get(r.employee_id)
        emp_name = emp.name if emp else r.employee_id
        rows.append([
            emp_name,
            r.leave_type,
            str(r.start_date),
            str(r.end_date),
            r.status,
            r.reason or "",
        ])

    title = "Leave Report"
    metadata = f"<b>Generated by:</b> {user.email}<br/><b>Date:</b> {datetime.now().strftime('%d %B %Y')}<br/><b>Total:</b> {len(records)}"
    buffer = build_pdf(title, metadata, header, rows)
    log_export(db, user.email, "EXPORT_LEAVE_PDF", metadata)
    filename = f"leave_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ═══════════════════════════════════════════════
# SUMMARY ENDPOINTS
# ═══════════════════════════════════════════════

@router.get("/summary")
def department_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    employees = db.query(Employee).all()
    summary = {}
    for e in employees:
        dept = e.department or "Unknown"
        summary.setdefault(dept, {"department": dept, "count": 0})
        summary[dept]["count"] += 1

    result = list(summary.values())
    log_export(db, user.email, "VIEW_DEPARTMENT_SUMMARY", "Viewed department summary")
    return {
        "success": True,
        "message": "Department summary",
        "data": {
            "total_departments": len(result),
            "departments": result,
        }
    }


@router.get("/roles-summary")
def role_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin"))
):
    employees = db.query(Employee).all()
    summary = {"admin": 0, "hr": 0, "employee": 0}
    for e in employees:
        role = e.system_role or "employee"
        if role in summary:
            summary[role] += 1
        else:
            summary[role] = 1
    log_export(db, user.email, "VIEW_ROLE_SUMMARY", "Viewed role summary")
    return {"success": True, "message": "Role summary", "data": summary}


@router.get("/designation-summary")
def designation_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "hr"))
):
    employees = db.query(Employee).all()
    summary = {}
    for e in employees:
        des = e.designation or "Unknown"
        summary.setdefault(des, {"designation": des, "count": 0})
        summary[des]["count"] += 1

    result = list(summary.values())
    log_export(db, user.email, "VIEW_DESIGNATION_SUMMARY", "Viewed designation summary")
    return {
        "success": True,
        "message": "Designation summary",
        "data": {
            "total_designations": len(result),
            "designations": result,
        }
    }