from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.activity_model import Activity
from app.models.user_model import User
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(
    prefix="/activities",
    tags=["Activities"]
)


# ==========================================
# GET MY ACTIVITIES
# ==========================================
@router.get("/")
def get_my_activities(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = (
        db.query(Activity)
        .filter(Activity.user_email == current_user.email)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "activities": [
            {
                "id": a.id,
                "action": a.action,
                "module": a.module,
                "details": a.details,
                "created_at": a.created_at.isoformat(),
            }
            for a in activities
        ]
    }


# ==========================================
# ADMIN GET ALL ACTIVITIES
# ==========================================
@router.get("/all")
def get_all_activities(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("admin","hr")),
):
    activities = (
        db.query(Activity)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "activities": [
            {
                "id": a.id,
                "user_email": a.user_email,
                "action": a.action,
                "module": a.module,
                "details": a.details,
                "created_at": a.created_at.isoformat(),
            }
            for a in activities
        ]
    }