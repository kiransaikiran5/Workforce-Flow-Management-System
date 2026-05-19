from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from datetime import datetime
from sqlalchemy.orm import relationship
from app.db.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    system_role = Column(String, default="employee")
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    salary = Column(Float, default=0.0)
    profile_image = Column(String, nullable=True)

    # ✅ new column for Module 4
    date_joined = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    attendance_records = relationship("Attendance", back_populates="employee")