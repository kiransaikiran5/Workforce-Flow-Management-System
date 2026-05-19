from datetime import datetime, timezone
from pathlib import Path
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.document import Document
from app.models.employee_model import Employee
from app.models.user_model import User
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter()

# Allowed file types and max size (10 MB)
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv", ".png", ".jpg", ".jpeg", ".gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

UPLOAD_DIR = Path("static/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────
# ✅ UPLOAD DOCUMENT
# ─────────────────────────────────────────────────
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    employee_id: Optional[int] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB")

    # Create a safe filename (unique)
    safe_name = f"{current_user.id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name

    with open(file_path, "wb") as f:
        f.write(contents)

    # Save record to DB
    doc = Document(
        filename=file.filename,
        file_path=str(file_path),
        uploaded_by=current_user.id,
        employee_id=employee_id,
        description=description
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "url": f"/static/documents/{safe_name}",
        "employee_id": doc.employee_id,
        "description": doc.description,
        "created_at": doc.created_at.isoformat()
    }


# ─────────────────────────────────────────────────
# ✅ LIST ALL DOCUMENTS (admin/hr/manager)
# ─────────────────────────────────────────────────
@router.get("/")
def list_documents(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only admin, manager, or hr can list all documents
    if current_user.role not in ("admin","hr"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    query = db.query(Document).order_by(Document.created_at.desc())
    total = query.count()
    docs = query.offset(skip).limit(limit).all()

    return {
        "data": [
            {
                "id": d.id,
                "filename": d.filename,
                "url": d.file_path.replace("\\", "/").replace("static/", "/static/"),
                "employee_id": d.employee_id,
                "uploaded_by": d.uploaded_by,
                "description": d.description,
                "created_at": d.created_at.isoformat()
            }
            for d in docs
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


# ─────────────────────────────────────────────────
# ✅ GET MY OWN DOCUMENTS (employee self-service)
# ─────────────────────────────────────────────────
@router.get("/my")
def my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not emp:
        return []
    docs = db.query(Document).filter(Document.employee_id == emp.id).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "url": d.file_path.replace("\\", "/").replace("static/", "/static/"),
            "description": d.description,
            "created_at": d.created_at.isoformat()
        }
        for d in docs
    ]


# ─────────────────────────────────────────────────
# ✅ DELETE A DOCUMENT (admin only)
# ─────────────────────────────────────────────────
@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "hr"))
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove the file from disk
    file_path = Path(doc.file_path)
    if file_path.exists():
        os.remove(file_path)

    db.delete(doc)
    db.commit()
    return None

from fastapi.responses import FileResponse

@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if user has permission (e.g., admin/HR or owner)
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    is_admin_hr = current_user.role in ("admin","hr")
    if not is_admin_hr and (not emp or doc.employee_id != emp.id):
        raise HTTPException(status_code=403, detail="Access denied")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=str(file_path),
        filename=doc.filename,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'}
    )