from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.models.chat_message import ChatMessage
from app.models.user_model import User
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/chat", tags=["Chat"])

# ── Send a message ──────────────────────────────────
@router.post("/send")
def send_message(
    receiver_id: int = Body(...),
    message: str = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = ChatMessage(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message=message.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message": msg.message,
        "read": msg.read,
        "created_at": msg.created_at.isoformat() + "Z"
    }

# ── Get conversation history with a specific user ────
@router.get("/history/{user_id}")
def get_history(
    user_id: int,
    limit: int = 50,
    before_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ChatMessage).filter(
        or_(
            and_(ChatMessage.sender_id == current_user.id, ChatMessage.receiver_id == user_id),
            and_(ChatMessage.sender_id == user_id, ChatMessage.receiver_id == current_user.id)
        )
    )
    if before_id:
        query = query.filter(ChatMessage.id < before_id)

    messages = query.order_by(ChatMessage.id.desc()).limit(limit).all()
    # return in chronological order
    messages = list(reversed(messages))

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "message": m.message,
            "read": m.read,
            "created_at": m.created_at.isoformat() + "Z"
        }
        for m in messages
    ]

# ── Get chat contacts (users with whom the current user has exchanged messages) ──
@router.get("/contacts")
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find distinct user IDs that have chatted with current_user
    sent_to = db.query(ChatMessage.receiver_id).filter(ChatMessage.sender_id == current_user.id).distinct()
    received_from = db.query(ChatMessage.sender_id).filter(ChatMessage.receiver_id == current_user.id).distinct()
    contact_ids = set([r for (r,) in sent_to.all()] + [s for (s,) in received_from.all()])

    contacts = []
    for uid in contact_ids:
        user = db.query(User).filter(User.id == uid).first()
        if user:
            # unread count from that user
            unread = db.query(ChatMessage).filter(
                ChatMessage.sender_id == uid,
                ChatMessage.receiver_id == current_user.id,
                ChatMessage.read == False
            ).count()
            contacts.append({
                "id": user.id,
                "name": user.name or user.email.split("@")[0],
                "email": user.email,
                "role": user.role,
                "unread": unread
            })
    return contacts

@router.get("/users")
def get_chatable_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all users except the currently logged‑in user,
    so they can be selected to start a new chat.
    """
    users = db.query(User).filter(User.id != current_user.id).all()
    return [
        {
            "id": user.id,
            "name": user.name or user.email.split("@")[0],
            "email": user.email,
            "role": user.role,
        }
        for user in users
    ]

# ── Mark messages from a user as read ───────────────
@router.put("/mark-read/{user_id}")
def mark_messages_read(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated = db.query(ChatMessage).filter(
        ChatMessage.sender_id == user_id,
        ChatMessage.receiver_id == current_user.id,
        ChatMessage.read == False
    ).update({"read": True}, synchronize_session=False)
    db.commit()
    return {"updated": updated}