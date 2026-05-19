# app/routes/employee_routes.py

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Body,
    UploadFile,
    File,
    BackgroundTasks,
)
from sqlalchemy.orm import Session
from typing import Optional, List
import secrets
from pathlib import Path

from app.db.database import get_db
from app.models.employee_model import Employee
from app.models.user_model import User
from app.models.notification_model import Notification
from app.models.audit_log_model import AuditLog   # still needed for /me/activity

from app.schemas.employee_schema import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
)

from app.services.employee_service import (
    update_employee,
    delete_employee,
)

from app.utils.dependencies import require_roles
from app.utils.security import hash_password

from app.utils.email_service import (
    send_email_logged,
    send_registration_email,
    send_profile_update_email,
    send_role_change_email,
)
from app.utils.activity_logger import log_activity   # ✅ unified helper

router = APIRouter()

# =====================================================
# CONFIG
# =====================================================

ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
]

MAX_IMAGE_SIZE = 2 * 1024 * 1024

ALLOWED_SORT_FIELDS = {
    "name",
    "email",
    "department",
    "designation",
    "system_role",
    "id",
    "salary",
}

# =====================================================
# GET CURRENT USER PROFILE
# =====================================================

@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("admin", "hr", "employee")
    )
):
    emp = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not emp:
        emp = Employee(
            user_id=current_user.id,
            name=current_user.name or current_user.email.split("@")[0],
            email=current_user.email,
            department="General",
            designation="Employee",
            system_role=current_user.role,
            salary=0.0,
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)

    return {
        "id": emp.id,
        "full_name": emp.name,
        "email": emp.email,
        "department": emp.department,
        "job_title": emp.designation,
        "system_role": emp.system_role,
        "phone": emp.phone,
        "address": emp.address,
        "salary": emp.salary,
        "profile_image": emp.profile_image or "",
        "user_id": emp.user_id,
    }

# =====================================================
# UPDATE OWN PROFILE
# =====================================================

@router.put("/me")
def update_my_profile(
    payload: dict = Body(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("admin", "hr", "employee")
    )
):
    emp = db.query(Employee).filter(
        Employee.user_id == current_user.id
    ).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Profile not found")

    allowed_fields = {
        "full_name",
        "phone",
        "address",
        "job_title",
        "profile_image",
        "salary",
    }

    updated_fields = []

    for key, value in payload.items():
        if key not in allowed_fields:
            continue
        if isinstance(value, str):
            value = value.strip()

        if key == "full_name":
            if value != emp.name:
                emp.name = value
                updated_fields.append("Full Name")
        elif key == "job_title":
            if value != emp.designation:
                emp.designation = value
                updated_fields.append("Job Title")
        elif key == "salary":
            try:
                new_salary = float(value) if value else 0.0
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid salary")
            if emp.salary != new_salary:
                emp.salary = new_salary
                updated_fields.append("Salary")
        elif key == "profile_image":
            if value != emp.profile_image:
                emp.profile_image = value
                updated_fields.append("Profile Image")
        else:
            if getattr(emp, key) != value:
                setattr(emp, key, value)
                updated_fields.append(
                    key.replace("_", " ").title()
                )

    db.commit()
    db.refresh(emp)

    if updated_fields:
        send_profile_update_email(
            db=db,
            email=emp.email,
            name=emp.name,
            updated_fields=", ".join(updated_fields),
            background_tasks=background_tasks
        )

    return {
        "id": emp.id,
        "full_name": emp.name,
        "email": emp.email,
        "department": emp.department,
        "job_title": emp.designation,
        "system_role": emp.system_role,
        "phone": emp.phone,
        "address": emp.address,
        "salary": emp.salary,
        "profile_image": emp.profile_image or "",
        "user_id": emp.user_id,
    }

# =====================================================
# MY ACTIVITY
# =====================================================

@router.get("/me/activity")
def get_my_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("admin", "hr", "employee")
    )
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.performed_by == current_user.email)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": log.id,
            "action": log.action,
            "target": log.target,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

# =====================================================
# GET EMPLOYEES
# =====================================================

@router.get("/")
def get_employees(
    department: Optional[str] = Query(None),
    designation: Optional[str] = Query(None),
    system_role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("id"),
    order: Optional[str] = Query("desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "hr"))
):
    query = db.query(Employee)

    if department:
        query = query.filter(
            Employee.department.ilike(f"%{department}%")
        )
    if designation:
        query = query.filter(
            Employee.designation.ilike(f"%{designation}%")
        )
    if system_role:
        query = query.filter(
            Employee.system_role.ilike(f"%{system_role}%")
        )
    if search:
        query = query.filter(
            (Employee.name.ilike(f"%{search}%")) |
            (Employee.email.ilike(f"%{search}%"))
        )

    if sort_by not in ALLOWED_SORT_FIELDS:
        sort_by = "id"

    sort_column = getattr(Employee, sort_by)

    if order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    total = query.count()
    employees = query.offset(skip).limit(limit).all()

    result = []
    for emp in employees:
        result.append({
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "department": emp.department,
            "designation": emp.designation,
            "system_role": emp.system_role,
            "phone": emp.phone,
            "address": emp.address,
            "salary": emp.salary,
            "user_id": emp.user_id,
            "profile_image": emp.profile_image or "",
        })

    return {
        "data": result,
        "total": total,
        "skip": skip,
        "limit": limit,
    }

# =====================================================
# CREATE EMPLOYEE
# =====================================================

@router.post("/")
def create_employee(
    emp: EmployeeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin","hr"))
):
    existing = db.query(Employee).filter(
        Employee.email == emp.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Employee already exists")

    temp_password = secrets.token_hex(4)
    hashed_pwd = hash_password(temp_password)

    new_user = User(
        name=emp.name,
        email=emp.email,
        password=hashed_pwd,
        role=emp.system_role
    )
    db.add(new_user)
    db.flush()

    new_emp = Employee(
        name=emp.name,
        email=emp.email,
        department=emp.department,
        designation=emp.designation,
        system_role=emp.system_role,
        phone=emp.phone,
        address=emp.address,
        salary=getattr(emp, "salary", 0.0),
        user_id=new_user.id
    )
    db.add(new_emp)

    # ✅ Activity log
    log_activity(
        db=db,
        user_email=user.email,
        action="Created Employee",
        module="Employee",
        details=f"Created employee {new_emp.name} ({new_emp.email})"
    )

    # Notification
    notif = Notification(
        message=f"{user.email} created employee {emp.email}",
        user_email=user.email,
        type="employee_create"
    )
    db.add(notif)

    db.commit()

    # Send registration email
    send_registration_email(
        db=db,
        email=emp.email,
        name=emp.name,
        password=temp_password,
        department=emp.department,
        designation=emp.designation,
        role=emp.system_role,
        background_tasks=background_tasks
    )

    return {
        "success": True,
        "message": "Employee created successfully"
    }

# =====================================================
# UPDATE EMPLOYEE
# =====================================================

@router.put("/{emp_id}", response_model=EmployeeResponse)
def update_employee_route(
    emp_id: int,
    emp: EmployeeUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "hr"))
):
    old_employee = db.query(Employee).filter(
        Employee.id == emp_id
    ).first()

    if not old_employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_role = old_employee.system_role

    updated = update_employee(db, emp_id, emp)
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")

    # ✅ Activity log – replaces manual AuditLog
    log_activity(
        db=db,
        user_email=user.email,
        action="Updated Employee",
        module="Employee",
        details=f"Updated employee {updated.email}"
    )

    # Notification
    notif = Notification(
        message=f"{user.email} updated employee {updated.email}",
        user_email=user.email,
        type="employee_update"
    )
    db.add(notif)

    db.commit()

    # Profile update email
    send_profile_update_email(
        db=db,
        email=updated.email,
        name=updated.name,
        updated_fields="Employee profile updated",
        background_tasks=background_tasks
    )

    # Role change email
    if old_role != updated.system_role:
        send_role_change_email(
            db=db,
            email=updated.email,
            name=updated.name,
            old_role=old_role,
            new_role=updated.system_role,
            background_tasks=background_tasks
        )

    return updated

# =====================================================
# DELETE EMPLOYEE
# =====================================================

@router.delete("/{emp_id}")
def delete_employee_route(
    emp_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin"))
):
    employee = db.query(Employee).filter(
        Employee.id == emp_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    send_email_logged(
        db,
        employee.email,
        "Account Deleted",
        f"Hello {employee.name}, your account has been deleted from WFMS."
    )

    deleted = delete_employee(db, emp_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Delete failed")

    # ✅ Activity log
    log_activity(
        db=db,
        user_email=user.email,
        action="Deleted Employee",
        module="Employee",
        details=f"Deleted employee {employee.name} ({employee.email})"
    )

    # Notification
    notif = Notification(
        message=f"{user.email} deleted employee {employee.email}",
        user_email=user.email,
        type="employee_delete"
    )
    db.add(notif)

    db.commit()

    return {
        "success": True,
        "message": "Employee deleted successfully"
    }

# =====================================================
# BULK DELETE
# =====================================================

@router.post("/bulk-delete")
def bulk_delete_employees(
    ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin"))
):
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")

    employees = db.query(Employee).filter(
        Employee.id.in_(ids)
    ).all()

    deleted_count = 0
    for emp in employees:
        db.delete(emp)
        user_record = db.query(User).filter(User.id == emp.user_id).first()
        if user_record:
            db.delete(user_record)
        deleted_count += 1

    db.commit()
    return {
        "success": True,
        "message": f"{deleted_count} employees deleted"
    }

# =====================================================
# UPLOAD PROFILE PHOTO
# =====================================================

@router.post("/{emp_id}/photo")
async def upload_profile_photo(
    emp_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "hr", "employee"))
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image type")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if user.role == "employee":
        if emp.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not allowed")

    upload_dir = Path("static/photos")
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix
    safe_filename = f"emp_{emp_id}{ext}"
    file_path = upload_dir / safe_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    profile_image_url = f"/static/photos/{safe_filename}"
    emp.profile_image = profile_image_url
    db.commit()

    return {
        "success": True,
        "profile_image": profile_image_url
    }