from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime, date
from typing import Optional, List, Union
from decimal import Decimal

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
    operation_date: Union[datetime, date]
    description: str
    account: str
    category: str
    amount: Decimal = Field(..., decimal_places=2)

    @validator('amount', pre=True)
    def convert_to_decimal(cls, v):
        """
        Converts various input types to Decimal with 2 decimal places
        """
        if isinstance(v, (int, float, str)):
            return round(Decimal(str(v)), 2)
        return v

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)  # Convert Decimal to float for JSON serialization
        }

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

class TransactionUpdate(BaseModel):
    operation_date: Optional[Union[datetime, date]] = None
    description: Optional[str] = None
    account: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None

# Pagination schema
class PaginatedTransactions(BaseModel):
    transactions: List[TransactionResponse]
    page: int
    page_size: int
    total_transactions: int
    total_pages: int

# Summary and analytics schemas
class CategorySummary(BaseModel):
    category: str
    total: Decimal

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)  # Convert Decimal to float for JSON serialization
        }

class PeriodSummary(BaseModel):
    period: str  # e.g., "2023-10" for monthly, "2023" for yearly
    total: Decimal

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)  # Convert Decimal to float for JSON serialization
        }

class AnalyticsResponse(BaseModel):
    top_categories: List[CategorySummary]
    period_summary: List[PeriodSummary]