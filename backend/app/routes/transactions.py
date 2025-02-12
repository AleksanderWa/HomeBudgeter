import csv
import io
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Optional

from backend.app.database.database import get_db
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.models.models import Category  # Assuming we'll create this model
from backend.app.schemas.schemas import (
    PaginatedTransactions,
    TransactionBase,
    TransactionCreate,
    CategoryCreate,
)
from backend.app.utils.auth import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

router = APIRouter()


@router.put("/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    text_contents = contents.decode("utf-8")
    csv_file = io.StringIO(text_contents)

    reader = csv.DictReader(csv_file, delimiter=";")

    transactions = []
    for row in reader:
        try:
            amount_str = row["#Kwota"].replace(" PLN", "").replace(",", ".").strip()
            amount = Decimal(amount_str).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        except (InvalidOperation, KeyError) as e:
            # Log the error or handle invalid amount
            print(f"Error processing amount: {amount_str}. Error: {e}")
            continue

        transactions.append(
            Transaction(
                operation_date=datetime.strptime(
                    row["#Data operacji"], "%Y-%m-%d"
                ).date(),
                description=row["#Opis operacji"],
                account=row["#Rachunek"],
                category=row["#Kategoria"],
                amount=amount,
                user_id=current_user.id,
            )
        )

    db.bulk_save_objects(transactions)
    db.commit()
    return {"message": f"{len(transactions)} transactions uploaded successfully"}


@router.get("/summary")
def get_summary(
    period: str = "month",
    top_n: Optional[int] = Query(
        None, description="Number of top categories to return (5 or 10)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    period_start = None

    if period == "month":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        period_start = now.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )

    query = db.query(
        Transaction.category, func.sum(Transaction.amount).label("total_amount")
    ).filter(Transaction.user_id == current_user.id)

    if period_start:
        query = query.filter(Transaction.date >= period_start)

    query = query.group_by(Transaction.category).order_by(
        func.sum(Transaction.amount).desc()
    )

    if top_n in [5, 10]:
        query = query.limit(top_n)

    results = query.all()

    summary = {
        "categories": [
            {"category": result.category, "amount": float(result.total_amount)}
            for result in results
        ],
        "period": period,
        "from_date": period_start.isoformat() if period_start else None,
    }

    return summary


@router.get("/categories", response_model=dict)
def get_transaction_categories(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Retrieve unique transaction categories for the current user.

    Returns a list of unique category names sorted alphabetically.
    """
    categories = (
        db.query(Transaction.category)
        .filter(Transaction.user_id == current_user.id)
        .distinct()
        .order_by(Transaction.category)
        .all()
    )

    unique_categories = [cat[0] for cat in categories if cat[0] and cat[0].strip()]

    return {"categories": unique_categories}


@router.post("/categories", response_model=dict)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new category for the current user.
    
    - Validates the category name
    - Checks for uniqueness per user
    - Prevents duplicate categories
    """
    try:
        # Normalize category name (strip whitespace, convert to title case)
        normalized_name = category_data.name.strip().title()
        
        # Check if category already exists for this user
        existing_category = (
            db.query(Category)
            .filter(
                Category.name.ilike(normalized_name), 
                Category.user_id == current_user.id
            )
            .first()
        )
        
        if existing_category:
            raise HTTPException(
                status_code=400, 
                detail=f"Category '{normalized_name}' already exists"
            )
        
        # Create new category
        new_category = Category(
            name=normalized_name,
            user_id=current_user.id
        )
        
        # Add and commit the category
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        
        return {
            "message": "Category created successfully", 
            "category": normalized_name
        }
    
    except IntegrityError:
        # Rollback in case of database integrity error
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Error creating category. Please try again."
        )
    except Exception as e:
        # Rollback for any other unexpected errors
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/", response_model=PaginatedTransactions)
def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch paginated transactions for the current user.

    - `page`: Page number (starts from 1)
    - `page_size`: Number of transactions per page (default 100, max 1000)

    Returns a list of transactions sorted by operation date in descending order.
    """
    offset = (page - 1) * page_size

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.operation_date))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    total_transactions = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == current_user.id)
        .scalar()
    )

    total_pages = (total_transactions + page_size - 1) // page_size

    return {
        "transactions": transactions,
        "page": page,
        "page_size": page_size,
        "total_transactions": total_transactions,
        "total_pages": total_pages,
    }


@router.post("/", response_model=TransactionBase)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new transaction for the current user.

    - Validates the transaction data
    - Assigns the transaction to the current user
    - Saves the transaction to the database
    """
    try:
        amount = Decimal(transaction.amount).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        new_transaction = Transaction(
            operation_date=transaction.operation_date,
            description=transaction.description,
            category=transaction.category,
            amount=amount,
            user_id=current_user.id,
        )

        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return new_transaction

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, detail=f"Error creating transaction: {str(e)}"
        )


@router.delete("/{transaction_id}", response_model=dict)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a transaction for the current user.

    - Checks if the transaction exists
    - Verifies the transaction belongs to the current user
    - Deletes the transaction from the database
    """

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id, Transaction.user_id == current_user.id
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found or you do not have permission to delete it",
        )

    db.delete(transaction)
    db.commit()

    return {"message": "Transaction deleted successfully"}
