import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# =====================================================
# CREATE EMPLOYEE
# =====================================================
class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr

    department: str
    designation: str

    system_role: str = "employee"

    phone: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[float] = 0.0  


# =====================================================
# UPDATE EMPLOYEE
# =====================================================
class EmployeeUpdate(BaseModel):
    name: Optional[str] = None

    department: Optional[str] = None
    designation: Optional[str] = None

    system_role: Optional[str] = None

    phone: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[float] = None


# =====================================================
# RESPONSE
# =====================================================
class EmployeeResponse(BaseModel):
    id: int

    name: str
    email: EmailStr

    department: Optional[str] = None
    designation: Optional[str] = None

    system_role: Optional[str] = None

    phone: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[float] = None
    user_id: Optional[int] = None
    
    # ✅ NEW: profile_image (already returned by the backend)
    profile_image: Optional[str] = None

    # ✅ NEW: date_joined (if you want to show it in the employee table)
    date_joined: Optional[datetime] = None

    class Config:
        from_attributes = True
