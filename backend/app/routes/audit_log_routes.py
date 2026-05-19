# app/routes/audit_log_routes.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.audit_log_model import AuditLog
from app.utils.dependencies import require_roles

router = APIRouter()

@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_roles("admin", "hr"))
):
    offset = (page - 1) * limit
    total = db.query(AuditLog).count()
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "logs": [
            {
                "id": log.id,
                "performed_by": log.performed_by,
                "action": log.action,
                "module": log.module,          # added
                "target": log.target,
                "details": log.details,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }