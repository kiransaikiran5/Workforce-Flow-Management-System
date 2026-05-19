from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db
from app.models.department_model import Department
from app.models.employee_model import Employee
from app.models.user_model import User
from app.utils.dependencies import require_roles, get_current_user

router = APIRouter()


# ──────────────────────────────────────────────
# ✅ GET ALL DEPARTMENTS (any authenticated user)
# ──────────────────────────────────────────────
@router.get("/")
def get_departments(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all departments with live employee counts."""
    query = db.query(Department)
    if search:
        query = query.filter(Department.name.ilike(f"%{search}%"))
    departments = query.order_by(Department.name).all()

    result = []
    for dept in departments:
        count = db.query(Employee).filter(Employee.department == dept.name).count()
        result.append({
            "id": dept.id,
            "name": dept.name,
            "employee_count": count
        })
    return result


# ──────────────────────────────────────────────
# ✅ GET A SINGLE DEPARTMENT
# ──────────────────────────────────────────────
@router.get("/{department_id}")
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"id": dept.id, "name": dept.name}


# ──────────────────────────────────────────────
# ✅ CREATE A NEW DEPARTMENT (admin/hr only)
# ──────────────────────────────────────────────
@router.post("/", status_code=201)
def create_department(
    name: str = Body(..., embed=True),                # ✅ accepts JSON body {"name": "..."}
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    """Create a new department. Name must be unique."""
    if not name.strip():
        raise HTTPException(status_code=400, detail="Department name is required")

    name = name.strip()
    existing = db.query(Department).filter(Department.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")

    dept = Department(name=name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": dept.id, "name": dept.name}


# ──────────────────────────────────────────────
# ✅ UPDATE A DEPARTMENT (admin/hr only)
# ──────────────────────────────────────────────
@router.put("/{department_id}")
def update_department(
    department_id: int,
    name: str = Body(..., embed=True),                # ✅ accepts JSON body
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    # Check uniqueness (excluding the current department)
    dup = db.query(Department).filter(
        Department.name == name,
        Department.id != department_id
    ).first()
    if dup:
        raise HTTPException(status_code=400, detail="Another department already has this name")

    dept.name = name
    db.commit()
    db.refresh(dept)
    return {"id": dept.id, "name": dept.name}


# ──────────────────────────────────────────────
# ✅ DELETE A DEPARTMENT (admin/hr only)
# ──────────────────────────────────────────────
@router.delete("/{department_id}", status_code=204)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    db.delete(dept)
    db.commit()
    return None   # 204 No Content