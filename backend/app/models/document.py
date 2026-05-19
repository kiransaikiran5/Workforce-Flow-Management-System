from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)   # optional link to employee
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional relationships (for convenience, not required)
    # uploader = relationship("User", backref="documents")
    # employee = relationship("Employee", backref="documents")