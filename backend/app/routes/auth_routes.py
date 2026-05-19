# app/routes/auth_routes.py
from fastapi import APIRouter, Depends, HTTPException, Body, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
from fastapi.security import OAuth2PasswordRequestForm

from app.db.database import get_db
from app.models.user_model import User
from app.models.employee_model import Employee
from app.schemas.user_schema import UserCreate
from app.services.auth_service import create_user, authenticate_user
from app.utils.dependencies import get_current_user, require_role
from app.utils.jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
)
from app.utils.security import hash_password
from app.utils.email_service import (
    send_email_logged,
    REGISTRATION_TEMPLATE,
    RESET_TEMPLATE,
)
from app.utils.activity_logger import log_activity   # ✅ unified helper

router = APIRouter()


def success_response(data=None, message="Success"):
    return {"success": True, "message": message, "data": data}


# ── Signup ─────────────────────────────────────────
@router.post("/signup")
def signup(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    new_user = create_user(db, user_data)

    body = REGISTRATION_TEMPLATE.format(
        name=new_user.name,
        email=new_user.email,
        password="(hidden)",
        department="—",
        designation="—",
        role=new_user.role,
    )
    send_email_logged(
        db=db,
        recipient=new_user.email,
        subject="Welcome to WFMS",
        body=body,
        background_tasks=background_tasks,
    )

    return success_response(
        data={"id": new_user.id, "email": new_user.email, "role": new_user.role},
        message="User created successfully",
    )


# ── Login (with activity logging) ──────────────────
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember: bool = Query(False),
    db: Session = Depends(get_db),
):
    auth_user = authenticate_user(db, form_data.username, form_data.password)
    if auth_user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not auth_user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    access_expiry = timedelta(days=30) if remember else None
    access_token = create_access_token(
        {"sub": auth_user.email, "role": auth_user.role},
        expires_delta=access_expiry,
    )
    refresh_token = create_refresh_token({"sub": auth_user.email, "role": auth_user.role})

    # ✅ Log login activity – will now appear in /activities/all
    log_activity(
        db=db,
        user_email=auth_user.email,
        action="User Login",
        module="Authentication",
        details="Logged into system",
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ── Refresh Token ──────────────────────────────────
@router.post("/refresh")
def refresh_access_token(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    payload = decode_token(refresh_token)
    if payload is None or not verify_token_type(payload, "refresh"):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": new_access, "token_type": "bearer"}


# ── Forgot Password ────────────────────────────────
@router.post("/forgot-password")
def forgot_password(
    data: dict,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return success_response(message="If the email exists, a reset token has been sent")

    token = secrets.token_hex(16)
    user.reset_token = token
    user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.commit()

    body = RESET_TEMPLATE.format(name=user.name, token=token)
    send_email_logged(
        db=db,
        recipient=user.email,
        subject="Password Reset Request",
        body=body,
        background_tasks=background_tasks,
    )

    return success_response(message="If the email exists, a reset token has been sent")


# ── Reset Password ─────────────────────────────────
@router.post("/reset-password")
def reset_password(data: dict, db: Session = Depends(get_db)):
    token = data.get("token", "").strip()
    new_password = data.get("new_password")
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password required")

    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")

    # Ensure the stored expiry is timezone‑aware (assume UTC if naive)
    expiry = user.reset_token_expiry
    if expiry is None:
        raise HTTPException(status_code=400, detail="Token expired")
    if expiry.tzinfo is None:
        # If it's naive, treat it as UTC
        from datetime import timezone as tz
        expiry = expiry.replace(tzinfo=tz.utc)

    if expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")

    user.password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    return success_response(message="Password reset successful")


# ── Get Current User ───────────────────────────────
@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()

    return success_response(
        data={
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "employee": {
                "id": employee.id,
                "name": employee.name,
                "department": employee.department,
                "designation": employee.designation,
                "phone": employee.phone,
                "profile_image": employee.profile_image,
                "date_joined": str(employee.date_joined) if employee and employee.date_joined else None,
            } if employee else None,
        }
    )


# ── Admin‑only test route ──────────────────────────
@router.get("/admin")
def admin_only(user: User = Depends(require_role("admin"))):
    return success_response(message="Welcome Admin")