# app/services/auth_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user_model import User
from app.models.employee_model import Employee
from app.utils.security import hash_password, verify_password

def create_user(db: Session, user):
    # Check duplicate
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_pwd = hash_password(user.password)

    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_pwd,
        role=user.role.lower()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # ✅ Always create an Employee record (for all roles)
    # This ensures /employees/me works for everyone
    employee = Employee(
        name=new_user.name,
        email=new_user.email,
        department="Not Assigned",      # default
        designation="Not Assigned",     # default (maps to job_title in frontend)
        system_role=new_user.role,      # uses the user's role
        phone="",                       # optional – can be None or empty
        address="",
        user_id=new_user.id
    )
    db.add(employee)
    db.commit()

    return new_user


def authenticate_user(db: Session, email: str, password: str):
    """Return the User object if credentials are correct.
    Return None for invalid email/password.
    """
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return None

    if not verify_password(password, user.password):
        return None

    return user