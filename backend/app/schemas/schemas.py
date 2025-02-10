from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# Base schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User-related schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None

# Transaction-related schemas
class TransactionBase(BaseModel):
    operation_date: datetime
    description: str
    account: str
    category: str
    amount: float

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

class TransactionUpdate(BaseModel):
    operation_date: Optional[datetime] = None
    description: Optional[str] = None
    account: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None

# Summary and analytics schemas
class CategorySummary(BaseModel):
    category: str
    total: float

class PeriodSummary(BaseModel):
    period: str  # e.g., "2023-10" for monthly, "2023" for yearly
    total: float

class AnalyticsResponse(BaseModel):
    top_categories: List[CategorySummary]
    period_summary: List[PeriodSummary]