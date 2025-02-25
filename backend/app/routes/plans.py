import csv
import io
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Optional, List

from backend.app.database.database import get_db
from backend.app.models.transaction import Transaction, Category, Plan, CategoryLimit
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
)
from backend.app.utils.auth import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

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
    return [PlanResponse(id=plan.id, month=plan.month, year=plan.year, user_id=plan.user_id) for plan in plans]


@router.put("/category_limits/", response_model=CategoryLimitResponse)
async def update_category_limit(
    category_limit: CreateCategoryLimit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Find the existing category limit
    db_category_limit = db.query(CategoryLimit).filter(
        CategoryLimit.category_id == category_limit.category_id,
        CategoryLimit.user_id == current_user.id,
        CategoryLimit.plan_id == category_limit.plan_id
    ).first()

    if db_category_limit:
        # Update the existing limit
        db_category_limit.limit = category_limit.limit
    else:
        # Create a new category limit
        db_category_limit = CategoryLimit(
            category_id=category_limit.category_id,
            user_id=current_user.id,
            plan_id=category_limit.plan_id,
            limit=category_limit.limit
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if category_limit.user_id != current_user.id:
        raise HTTPException(status_code=403, detail='Not authorized to create this limit')
    
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
        raise HTTPException(status_code=400, detail='Limit already exists')

    db_category_limit = CategoryLimit(
        plan_id=plan_id,
        category_id=category_limit.category_id,
        user_id=category_limit.user_id,
        limit=category_limit.limit,
    )
    db.add(db_category_limit)
    db.commit()
    db.refresh(db_category_limit)
    return db_category_limit


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
