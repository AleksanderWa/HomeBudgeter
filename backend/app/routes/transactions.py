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
    TransactionSummaryResponse,
    TransactionEdit
)
from backend.app.utils.auth import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, func, extract
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

    # First, process and create unique categories
    category_names = set(
        row["#Kategoria"]
        for row in csv.DictReader(io.StringIO(text_contents), delimiter=";")
    )

    # Create or get existing categories
    categories = {}
    for category_name in category_names:
        existing_category = (
            db.query(Category)
            .filter(Category.name == category_name, Category.user_id == current_user.id)
            .first()
        )

        if not existing_category:
            new_category = Category(name=category_name, user_id=current_user.id)
            db.add(new_category)
            db.flush()  # This will assign an ID to the new category
            categories[category_name] = new_category.id
        else:
            categories[category_name] = existing_category.id

    # Reset the CSV reader
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
                category=categories[
                    row["#Kategoria"]
                ],  # Use category ID instead of name
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
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
    only_names: bool = False
):
    """
    Retrieve unique transaction categories for the current user.

    Returns a list of unique category names sorted alphabetically.
    """
    categories = (
        db.query(Category)
        .filter(Category.user_id == current_user.id)
        .distinct()
        .order_by(Category.name)
        .all()
    )

    # unique_categories = [cat[0] for cat in categories if cat[0] and cat[0].strip()]
    if only_names:
        return {"categories": set([cat.name for cat in categories])}
    else:
        return {"categories": [
            CategoryResponse(
                id=category.id,
                name=category.name,
                user_id=category.user_id
            ) for category in categories
        ]}


@router.post("/categories", response_model=dict)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
                Category.user_id == current_user.id,
            )
            .first()
        )

        if existing_category:
            raise HTTPException(
                status_code=400, detail=f"Category '{normalized_name}' already exists"
            )

        # Create new category
        new_category = Category(name=normalized_name, user_id=current_user.id)

        # Add and commit the category
        db.add(new_category)
        db.commit()
        db.refresh(new_category)

        return CategoryResponse(
            id=new_category.id, name=new_category.name, user_id=new_category.user_id
        )

    except IntegrityError:
        # Rollback in case of database integrity error
        db.rollback()
        raise HTTPException(
            status_code=500, detail="Error creating category. Please try again."
        )
    except Exception as e:
        # Rollback for any other unexpected errors
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


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
        db.query(Transaction, Category)
        .join(Category, Transaction.category == Category.id)
        .filter(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.operation_date))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # Transform the query results to match the response model
    transactions_with_category = [
        {**transaction.__dict__, "category": category.__dict__}
        for transaction, category in transactions
    ]

    total_transactions = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == current_user.id)
        .scalar()
    )

    total_pages = (total_transactions + page_size - 1) // page_size

    return {
        "transactions": transactions_with_category,
        "page": page,
        "page_size": page_size,
        "total_transactions": total_transactions,
        "total_pages": total_pages,
    }


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new transaction for the current user.

    - Validates the transaction data
    - Creates a new category if it doesn't exist
    - Saves the transaction to the database
    """
    amount = Decimal(transaction_data.amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


    category = (
        db.query(Category)
        .filter(
            func.lower(Category.name) == transaction_data.category.lower(),
            Category.user_id == current_user.id,
        )
        .first()
    )

    if not category:
        category = Category(name=transaction_data.category, user_id=current_user.id)
        db.add(category)
        db.commit()
        db.refresh(category)

    new_transaction = Transaction(
        operation_date=transaction_data.operation_date,
        description=transaction_data.description,
        category=category.id,
        amount=amount,
        user_id=current_user.id,
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # Create the response with full category details
    transaction_response = TransactionResponse(
        id=new_transaction.id,
        operation_date=new_transaction.operation_date,
        description=new_transaction.description,
        category=CategoryInTransaction(
            id=category.id, name=category.name, user_id=category.user_id
        ),
        amount=new_transaction.amount,
        user_id=new_transaction.user_id,
    )

    return transaction_response


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def edit_transaction(
    transaction_id: int, transaction_data: TransactionEdit,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Edit a transaction for the current user.

    - Checks if the transaction exists
    - Verifies the transaction belongs to the current user
    - Updates the transaction in the database
    - Returns the updated transaction
    """

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found or you do not have permission to edit it",
        )

    amount = Decimal(transaction_data.amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    category = (
        db.query(Category)
        .filter(
            Category.name.ilike(transaction_data.category_name),
            Category.user_id == current_user.id,
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=400,
            detail="Category not found or you do not have permission to edit it",
        )

    transaction.operation_date = transaction_data.operation_date
    transaction.description = transaction_data.description
    transaction.category = category.id
    transaction.amount = amount

    db.commit()
    db.refresh(transaction)

    return TransactionResponse(
        id=transaction.id,
        user_id=transaction.user_id,
        operation_date=transaction.operation_date,
        description=transaction.description,
        category=CategoryInTransaction(
            id=category.id, name=category.name, user_id=category.user_id
        ),
        amount=transaction.amount,
    )


@router.delete("/{transaction_id}", status_code=204)
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
    - Returns 204 No Content on successful deletion
    """

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
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


@router.get("/expenses_summary/", response_model=List[TransactionSummaryResponse])
async def get_expenses_summary(month: int, db: Session = Depends(get_db)):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12.")

    current_year = datetime.now().year  # Get the current year

    # Query to summarize expenses per category for the current year
    summary = (
        db.query(
            Category.id,
            Category.name,
            func.sum(Transaction.amount).label('expenses'),  # Sum of expenses
        )
        .join(Category, Transaction.category == Category.id)
        .filter(
            extract('year', Transaction.operation_date) == current_year,
            extract('month', Transaction.operation_date) == month  # Filter by current year and month
        )
        .group_by(Category.id, Category.name)  # Group by category fields only
        .all()
    )

    return [
        TransactionSummaryResponse(
            category_id=item[0],
            category_name=item[1],
            expenses=abs(item[2]),
            month=month
        )
        for item in summary
    ]
