from sqlalchemy import Column, Integer, String, ForeignKey, Date
from app.db.database import Base


class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    reason = Column(String)
    status = Column(String, default="pending")  # pending / approved
    days = Column(Integer)
