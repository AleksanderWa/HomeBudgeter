import csv
import io
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Optional, List

from backend.app.database.database import get_db
from backend.app.models.transaction import (
    Transaction,
    Category,
    Plan,
    CategoryLimit,
    PlanIncome,
)
from backend.app.models.user import User
from backend.app.schemas.schemas import (
    CategoryResponse,
    PaginatedTransactions,
    TransactionBase,
    TransactionCreate,
    CategoryCreate,
    TransactionResponse,
    CategoryInTransaction,
    CreatePlan,
    CreateCategoryLimit,
    PlanResponse,
    CategoryLimitResponse,
    CategoryLimitCreate,  # Added CategoryLimitCreate
    PlanIncomeCreate,
    PlanIncomeResponse,
    RareExpensesResponse,
)
from backend.app.utils.auth import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Added import for RareExpensesService
from backend.app.services.rare_expenses_service import RareExpensesService

router = APIRouter()


@router.post("/", response_model=PlanResponse)
async def create_plan(
    plan: CreatePlan,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_plan = Plan(**plan.model_dump(), user_id=current_user.id)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return PlanResponse(
        id=db_plan.id,
        month=db_plan.month,
        year=db_plan.year,
        user_id=db_plan.user_id,
    )


@router.get("/", response_model=List[PlanResponse])
async def get_plans(
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plans = (
        db.query(Plan).filter(Plan.user_id == current_user.id, Plan.year == year).all()
    )
    return [
        PlanResponse(id=plan.id, month=plan.month, year=plan.year, user_id=plan.user_id)
        for plan in plans
    ]


@router.put("/{plan_id}/category_limits/", response_model=CategoryLimitResponse)
async def update_category_limit(
    plan_id: int,
    category_limit: CategoryLimitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Find the existing category limit
    db_category_limit = (
        db.query(CategoryLimit)
        .filter(
            CategoryLimit.category_id == category_limit.category_id,
            CategoryLimit.user_id == current_user.id,
            CategoryLimit.plan_id == plan_id,
        )
        .first()
    )

    if db_category_limit:
        # Update the existing limit
        db_category_limit.limit = category_limit.limit
    else:
        # Create a new category limit
        db_category_limit = CategoryLimit(
            category_id=category_limit.category_id,
            user_id=current_user.id,
            plan_id=plan_id,
            limit=category_limit.limit,
        )
        db.add(db_category_limit)

    db.commit()
    db.refresh(db_category_limit)

    return CategoryLimitResponse(
        id=db_category_limit.id,
        category_id=db_category_limit.category_id,
        user_id=db_category_limit.user_id,
        plan_id=db_category_limit.plan_id,
        limit=db_category_limit.limit,
    )


@router.get("/{plan_id}/category_limits/", response_model=List[CategoryLimitResponse])
async def get_category_limits(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category_limits = (
        db.query(CategoryLimit)
        .filter(
            CategoryLimit.user_id == current_user.id, CategoryLimit.plan_id == plan_id
        )
        .join(Category, CategoryLimit.category_id == Category.id)
        .all()
    )
    return [
        CategoryLimitResponse(
            id=category_limit.id,
            category_id=category_limit.category.id,
            user_id=category_limit.user_id,
            plan_id=category_limit.plan_id,
            limit=category_limit.limit,
        )
        for category_limit in category_limits
    ]


@router.post("/{plan_id}/category_limits/", response_model=CategoryLimitResponse)
async def create_category_limit(
    plan_id: int,
    category_limit: CategoryLimitCreate,
    month: Optional[int] = Query(
        None, description="Month for creating a new plan if plan_id doesn't exist"
    ),
    year: Optional[int] = Query(
        None, description="Year for creating a new plan if plan_id doesn't exist"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Special case: plan_id=0 means we always want to create a new plan
    if plan_id == 0:
        if month is None or year is None:
            current_date = datetime.now()
            month = month or current_date.month
            year = year or current_date.year

        # Create new plan
        new_plan = Plan(month=month, year=year, user_id=current_user.id)
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        plan_id = new_plan.id
    else:
        # Check if the specified plan exists
        db_plan = (
            db.query(Plan)
            .filter(Plan.id == plan_id, Plan.user_id == current_user.id)
            .first()
        )

        # If plan doesn't exist, create a new one
        if not db_plan:
            # If month and year are provided, use them; otherwise use current date
            if month is None or year is None:
                current_date = datetime.now()
                month = month or current_date.month
                year = year or current_date.year

            # Create new plan
            new_plan = Plan(month=month, year=year, user_id=current_user.id)
            db.add(new_plan)
            db.commit()
            db.refresh(new_plan)
            plan_id = new_plan.id

    # Now check if the category limit already exists
    db_category_limit = (
        db.query(CategoryLimit)
        .filter(
            CategoryLimit.plan_id == plan_id,
            CategoryLimit.category_id == category_limit.category_id,
            CategoryLimit.user_id == current_user.id,
        )
        .first()
    )
    if db_category_limit:
        raise HTTPException(status_code=400, detail="Limit already exists")

    db_category_limit = CategoryLimit(
        plan_id=plan_id,
        category_id=category_limit.category_id,
        user_id=current_user.id,
        limit=category_limit.limit,
    )
    db.add(db_category_limit)
    db.commit()
    db.refresh(db_category_limit)

    return CategoryLimitResponse(
        id=db_category_limit.id,
        plan_id=db_category_limit.plan_id,
        category_id=db_category_limit.category_id,
        user_id=current_user.id,
        limit=db_category_limit.limit,
    )


@router.delete("/{plan_id}/categories/{category_id}", status_code=204)
async def delete_category_limit(
    plan_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_category_limit = (
        db.query(CategoryLimit)
        .filter(
            CategoryLimit.plan_id == plan_id,
            CategoryLimit.category_id == category_id,
            CategoryLimit.user_id == current_user.id,
        )
        .first()
    )
    if not db_category_limit:
        raise HTTPException(status_code=404, detail="Category limit not found")

    db.delete(db_category_limit)
    db.commit()


@router.post("/{plan_id}/income", response_model=PlanIncomeResponse)
async def create_or_update_plan_income(
    plan_id: int,
    income_data: PlanIncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if plan exists and belongs to user
    db_plan = (
        db.query(Plan)
        .filter(Plan.id == plan_id, Plan.user_id == current_user.id)
        .first()
    )

    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Check if income record already exists for this plan
    existing_income = (
        db.query(PlanIncome)
        .filter(PlanIncome.plan_id == plan_id, PlanIncome.user_id == current_user.id)
        .first()
    )

    if existing_income:
        # Update existing income
        existing_income.amount = income_data.amount
        if income_data.description is not None:
            existing_income.description = income_data.description
        db.commit()
        db.refresh(existing_income)
        return existing_income
    else:
        # Create new income record
        new_income = PlanIncome(
            plan_id=plan_id,
            user_id=current_user.id,
            amount=income_data.amount,
            description=income_data.description,
        )
        db.add(new_income)
        db.commit()
        db.refresh(new_income)
        return new_income


@router.get("/{plan_id}/income", response_model=PlanIncomeResponse)
async def get_plan_income(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if plan exists and belongs to user
    db_plan = (
        db.query(Plan)
        .filter(Plan.id == plan_id, Plan.user_id == current_user.id)
        .first()
    )

    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Get income for this plan
    income = (
        db.query(PlanIncome)
        .filter(PlanIncome.plan_id == plan_id, PlanIncome.user_id == current_user.id)
        .first()
    )

    if not income:
        # Return a default empty income
        return {
            "id": 0,
            "plan_id": plan_id,
            "user_id": current_user.id,
            "amount": 0.0,
            "description": None,
        }

    return income


@router.delete("/{plan_id}/income", status_code=204)
async def delete_plan_income(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if plan exists and belongs to user
    db_plan = (
        db.query(Plan)
        .filter(Plan.id == plan_id, Plan.user_id == current_user.id)
        .first()
    )

    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Find income for this plan
    income = (
        db.query(PlanIncome)
        .filter(PlanIncome.plan_id == plan_id, PlanIncome.user_id == current_user.id)
        .first()
    )

    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    # Delete the income
    db.delete(income)
    db.commit()


@router.get("/rare-expenses-summary", response_model=RareExpensesResponse)
async def get_rare_expenses_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    rare_expenses_service: RareExpensesService = Depends(
        RareExpensesService
    ),  # Inject service
):
    """
    Get a summary of rare expenses for the next 12 months and a suggested savings plan.
    """
    summary = rare_expenses_service.get_rare_expenses_summary(
        user_id=current_user.id, db=db
    )
    return summary
