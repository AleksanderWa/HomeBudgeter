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


# Category schema for nested representation
class CategoryInTransaction(BaseModel):
    id: int
    name: str
    user_id: int

    class Config:
        orm_mode = True


# Transaction-related schemas
class TransactionBase(BaseModel):
    operation_date: Union[datetime, date]
    description: str
    category: Optional[CategoryInTransaction]
    amount: Decimal = Field(..., decimal_places=2)

    @validator("amount", pre=True)
    def convert_to_decimal(cls, v):
        """
        Converts various input types to Decimal with 2 decimal places
        """
        if isinstance(v, (int, float, str)):
            return round(Decimal(str(v)), 2)
        return v

    class Config:
        json_encoders = {
            Decimal: lambda v: float(
                v
            )  # Convert Decimal to float for JSON serialization
        }
        orm_mode = True


class TransactionCreate(BaseModel):
    """
    Schema for creating a new transaction.
    Validates input data for transaction creation.
    """

    operation_date: Union[datetime, date]
    description: str
    category: str
    amount: Decimal = Field(..., decimal_places=2)
    account: Optional[str] = "default"

    @validator("amount", pre=True)
    def convert_to_decimal(cls, v):
        """
        Converts various input types to Decimal with 2 decimal places
        """
        if isinstance(v, (int, float, str)):
            return round(Decimal(str(v)), 2)
        return v

    @validator("description")
    def validate_description(cls, v):
        """
        Validate that description is not empty
        """
        if not v or len(v.strip()) == 0:
            raise ValueError("Description cannot be empty")
        return v.strip()

    @validator("category")
    def validate_category_name(cls, v):
        """
        Validate category name:
        - Remove leading/trailing whitespace
        - Ensure non-empty
        - Limit length
        """
        # Remove leading and trailing whitespace
        cleaned_name = v.strip()

        # Check if name is empty after stripping
        if not cleaned_name:
            raise ValueError("Category name cannot be empty")

        # Optional: Add length constraint
        if len(cleaned_name) > 50:
            raise ValueError("Category name must be 50 characters or less")

        return cleaned_name

    class Config:
        json_encoders = {
            Decimal: lambda v: float(
                v
            )  # Convert Decimal to float for JSON serialization
        }
        schema_extra = {
            "example": {
                "operation_date": "2023-06-15",
                "description": "Grocery shopping",
                "category": 1,  # Category ID
                "amount": -50.25,
                "account": "default",
            }
        }


class TransactionEdit(BaseModel):
    amount: float
    description: Optional[str] = None
    operation_date: Optional[datetime] = None
    category_name: Optional[str] = None
    user_id: int


class TransactionResponse(TransactionBase):
    id: int
    user_id: int


class TransactionUpdate(BaseModel):
    operation_date: Optional[Union[datetime, date]] = None
    description: Optional[str] = None
    account: Optional[str] = None
    category: Optional[int] = None  # Keep as ID for updates
    amount: Optional[Decimal] = None


class CategoryCreate(BaseModel):
    """
    Schema for creating a new category.
    Validates input data for category creation.
    """

    name: str

    @validator("name")
    def validate_category_name(cls, v):
        """
        Validate category name:
        - Remove leading/trailing whitespace
        - Ensure non-empty
        - Limit length
        """
        # Remove leading and trailing whitespace
        cleaned_name = v.strip()

        # Check if name is empty after stripping
        if not cleaned_name:
            raise ValueError("Category name cannot be empty")

        # Optional: Add length constraint
        if len(cleaned_name) > 50:
            raise ValueError("Category name must be 50 characters or less")

        return cleaned_name

    class Config:
        schema_extra = {"example": {"name": "Groceries"}}


class CategoryResponse(BaseModel):
    id: int
    name: str
    user_id: int
    main_categories: List[int] = []
    
    class Config:
        orm_mode = True


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
            Decimal: lambda v: float(
                v
            )  # Convert Decimal to float for JSON serialization
        }


class PeriodSummary(BaseModel):
    period: str  # e.g., "2023-10" for monthly, "2023" for yearly
    total: Decimal

    class Config:
        json_encoders = {
            Decimal: lambda v: float(
                v
            )  # Convert Decimal to float for JSON serialization
        }


class AnalyticsResponse(BaseModel):
    top_categories: List[CategorySummary]
    period_summary: List[PeriodSummary]


class CreatePlan(BaseModel):
    month: int
    year: int


class CreateCategoryLimit(BaseModel):
    category_id: int
    plan_id: int
    limit: Decimal


class PlanResponse(BaseModel):
    id: int
    month: int
    year: int
    user_id: int


class CategoryLimitResponse(BaseModel):
    id: int
    category_id: int
    user_id: int
    plan_id: int
    limit: float


class TransactionSummaryResponse(BaseModel):
    category_id: int
    category_name: str
    expenses: float
    limit: float
    month: int


class DashboardResponse(BaseModel):
    planned_amount: float
    spent_amount: float
    total_savings: float
    incomes: float
    spent_today: float
    spent_this_month: float
    spent_this_year: float


class CategoryEdit(BaseModel):
    name: str


class CategoryLimitCreate(BaseModel):
    category_id: int
    limit: float


class TransactionCategoryUpdate(BaseModel):
    category_id: int


class PlanIncomeCreate(BaseModel):
    amount: float
    description: Optional[str] = None


class PlanIncomeResponse(BaseModel):
    id: int
    plan_id: int
    user_id: int
    amount: float
    description: Optional[str] = None
    
    class Config:
        orm_mode = True


# Main Category Schemas
class MainCategoryCreate(BaseModel):
    name: str
    
    @validator("name")
    def validate_main_category_name(cls, v):
        cleaned_name = v.strip()
        if not cleaned_name:
            raise ValueError("Main category name cannot be empty")
        if len(cleaned_name) > 50:
            raise ValueError("Main category name must be 50 characters or less")
        return cleaned_name


class MainCategoryResponse(BaseModel):
    id: int
    name: str
    user_id: int
    
    class Config:
        orm_mode = True


class MainCategoryDetailResponse(MainCategoryResponse):
    categories: List[CategoryResponse]


# Transaction filter rule schemas
class TransactionFilterRuleBase(BaseModel):
    description_pattern: Optional[str] = None
    merchant_name: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    is_active: bool = True


class TransactionFilterRuleCreate(TransactionFilterRuleBase):
    pass


class TransactionFilterRuleUpdate(TransactionFilterRuleBase):
    description_pattern: Optional[str] = None
    merchant_name: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None


class TransactionFilterRuleResponse(TransactionFilterRuleBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
