from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from app.models.employee_model import Employee
from app.models.user_model import User
from typing import Optional, List

# Allowed fields for sorting (must match actual column names)
ALLOWED_SORT_FIELDS = {"name", "email", "department", "designation", "system_role", "id"}


# =====================================================
# ✅ PAGINATED, FILTERED, SORTABLE EMPLOYEE LIST
# =====================================================
def get_employees_paginated(
    db: Session,
    department: Optional[str] = None,
    designation: Optional[str] = None,
    system_role: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "id",
    order: str = "desc",
    skip: int = 0,
    limit: int = 10,
) -> dict:
    """
    Returns a paginated, filtered, and sorted list of employees.
    """
    query = db.query(Employee)

    # ── Filters ──────────────────────────────
    if department:
        query = query.filter(Employee.department.ilike(f"%{department}%"))
    if designation:
        query = query.filter(Employee.designation.ilike(f"%{designation}%"))
    if system_role:
        query = query.filter(Employee.system_role.ilike(f"%{system_role}%"))
    if search:
        query = query.filter(
            or_(
                Employee.name.ilike(f"%{search}%"),
                Employee.email.ilike(f"%{search}%"),
            )
        )

    # ── Sorting ──────────────────────────────
    if sort_by not in ALLOWED_SORT_FIELDS:
        sort_by = "id"
    sort_column = getattr(Employee, sort_by, Employee.id)
    if order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # ── Total count ──────────────────────────
    total = query.count()

    # ── Pagination ───────────────────────────
    employees = query.offset(skip).limit(limit).all()

    # Convert to list of dicts (or use Pydantic schema)
    result = [
        {
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "department": emp.department,
            "designation": emp.designation,
            "system_role": emp.system_role,
            "phone": emp.phone,
            "address": emp.address,
            "user_id": emp.user_id,
        }
        for emp in employees
    ]

    return {"data": result, "total": total, "skip": skip, "limit": limit}


# =====================================================
# ✅ GET ALL EMPLOYEES (simple, no pagination)
# =====================================================
def get_employees(db: Session) -> List[Employee]:
    return db.query(Employee).all()


# =====================================================
# ✅ GET SINGLE EMPLOYEE BY ID
# =====================================================
def get_employee_by_id(db: Session, emp_id: int) -> Employee:
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


# =====================================================
# ✅ CREATE EMPLOYEE (protected version with rollback)
# =====================================================
def create_employee(db: Session, emp) -> Employee:
    try:
        existing = db.query(Employee).filter(Employee.email == emp.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Employee with this email already exists")

        new_emp = Employee(**emp.dict())
        db.add(new_emp)
        db.commit()
        db.refresh(new_emp)
        return new_emp
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ✅ UPDATE EMPLOYEE (safe, prevents email duplicates)
# =====================================================
def update_employee(db: Session, emp_id: int, emp_data) -> Employee:
    try:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            return None

        update_data = emp_data.dict(exclude_unset=True)

        # Prevent email duplication if email is being changed
        if "email" in update_data:
            existing = db.query(Employee).filter(
                Employee.email == update_data["email"],
                Employee.id != emp_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already used by another employee")

        for key, value in update_data.items():
            setattr(emp, key, value)

        db.commit()
        db.refresh(emp)
        return emp
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ✅ DELETE EMPLOYEE (returns bool for success)
# =====================================================
def delete_employee(db: Session, emp_id: int) -> bool:
    try:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            return False
        db.delete(emp)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ✅ BULK DELETE EMPLOYEES (optional, for bulk operations)
# =====================================================
def bulk_delete_employees(db: Session, ids: List[int]) -> int:
    """
    Deletes multiple employees by their IDs.
    Returns the number of employees deleted.
    """
    try:
        employees = db.query(Employee).filter(Employee.id.in_(ids)).all()
        if not employees:
            return 0
        count = 0
        for emp in employees:
            db.delete(emp)
            count += 1
        db.commit()
        return count
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))