import csv
import io
from datetime import datetime, date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Optional, List

from backend.app.database.database import get_db
from backend.app.models.transaction import (
    Transaction,
    Category,
    Plan,
    CategoryLimit,
    MainCategory,
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
    TransactionSummaryResponse,
    TransactionEdit,
    DashboardResponse,
    CategoryEdit,
    MainCategoryResponse,
)
from backend.app.utils.auth import get_current_user
from backend.app.services.categorization_service import CategorizationService
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
                # account=row["#Rachunek"],
                category_id=categories[
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
        Transaction.category_id, func.sum(Transaction.amount).label("total_amount")
    ).filter(Transaction.user_id == current_user.id)

    if period_start:
        query = query.filter(Transaction.date >= period_start)

    query = query.group_by(Transaction.category_id).order_by(
        func.sum(Transaction.amount).desc()
    )

    if top_n in [5, 10]:
        query = query.limit(top_n)

    results = query.all()

    summary = {
        "categories": [
            {"category": result.category_id, "amount": float(result.total_amount)}
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
                user_id=category.user_id,
                main_categories=[mc.id for mc in category.main_categories]
            ) for category in categories
        ]}


@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_edit: CategoryEdit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    db_category.name = category_edit.name
    db.commit()
    db.refresh(db_category)
    db_category.main_categories = []
    return db_category


@router.post("/categories", response_model=CategoryResponse)
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
        normalized_name = category_data.name.replace(' ', '').lower()

        # Check if category already exists for this user
        existing_category = (
            db.query(Category)
            .filter(
                func.lower(func.replace(Category.name, ' ', '')) == normalized_name,
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
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=1900, le=2100),
    start_date: Optional[date] = Query(None, description="Filter transactions from this date onwards (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter transactions up to this date (YYYY-MM-DD)"),
    category_id: Optional[int] = Query(None, description="Filter transactions by category ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch paginated transactions for the current user.

    - `page`: Page number (starts from 1)
    - `page_size`: Number of transactions per page (default 100, max 1000)
    - `month`: Optional filter for month (1-12)
    - `year`: Optional filter for year
    - `start_date`: Optional start date filter (YYYY-MM-DD)
    - `end_date`: Optional end date filter (YYYY-MM-DD)

    Returns a list of transactions sorted by operation date in descending order.
    Includes transactions even if they don't have a category assigned.
    """
    # Calculate skip for pagination
    skip = (page - 1) * page_size

    # Start building the query
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    # Apply filters if provided
    if month:
        query = query.filter(extract("month", Transaction.operation_date) == month)
    if year:
        query = query.filter(extract("year", Transaction.operation_date) == year)
    if start_date:
        query = query.filter(Transaction.operation_date >= start_date)
    if end_date:
        query = query.filter(Transaction.operation_date <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    # Add ordering, pagination and execute
    transactions_query_result = (
        query
        .order_by(desc(Transaction.operation_date))
        .offset(skip)
        .limit(page_size)
        .all()
    )

    # Transform the query results to match the TransactionResponse model, handling null categories
    transactions_response_list = []
    for transaction in transactions_query_result:
        category_data = None
        if transaction.category_id:
            category_data = CategoryInTransaction(
                id=transaction.category_id,
                name=transaction.category.name,
                user_id=transaction.user_id
            )
        
        transactions_response_list.append(
            TransactionResponse(
                id=transaction.id,
                operation_date=transaction.operation_date,
                description=transaction.description,
                category=category_data, # Assign CategoryInTransaction or None
                amount=transaction.amount,
                user_id=transaction.user_id,
            )
        )

    # Count total transactions with the same filters
    count_query = db.query(func.count(Transaction.id)).filter(Transaction.user_id == current_user.id)
    if start_date:
        count_query = count_query.filter(Transaction.operation_date >= start_date)
    if end_date:
        count_query = count_query.filter(Transaction.operation_date <= end_date)
    elif month is not None:
        count_query = count_query.filter(extract('month', Transaction.operation_date) == month)
        if year is not None:
             count_query = count_query.filter(extract('year', Transaction.operation_date) == year)
    elif year is not None:
        count_query = count_query.filter(extract('year', Transaction.operation_date) == year)
        
    total_transactions = count_query.scalar()
    total_pages = (total_transactions + page_size - 1) // page_size

    return {
        "transactions": transactions_response_list,  # Use the correctly formatted list
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

    sanitized_name = transaction_data.category.lower().replace(' ', '')
    category = (
        db.query(Category)
        .filter(
            func.lower(func.replace(Category.name, ' ', '')) == sanitized_name,
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
        category_id=category.id,
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
    Edit a transaction for the current user and update categorization rules.

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
    
    category = None
    if transaction_data.category_name:
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
                detail=f"Category '{transaction_data.category_name}' not found or you do not have permission to use it",
            )

    # Update transaction fields
    if transaction_data.operation_date:
        transaction.operation_date = transaction_data.operation_date
    if transaction_data.description:
        transaction.description = transaction_data.description
    if category: # Only update category if a valid one was found
        transaction.category_id = category.id # Update category_id
    transaction.amount = amount

    # Update categorization rule if merchant name exists and category was changed
    if transaction.merchant_name and category:
        try:
            categorization_service = CategorizationService(db)
            categorization_service.create_or_update_rule(
                user_id=current_user.id, 
                category_id=category.id,
                merchant_name=transaction.merchant_name
            )
        except Exception as e:
            # Log the error e
            # Decide if this error should prevent the transaction edit from committing
            # For now, we'll let the commit proceed but potentially log the rule update failure
            print(f"Warning: Failed to update categorization rule for transaction {transaction_id}: {e}")
            # Optionally: db.rollback() and raise HTTPException if rule update is critical
    # If no merchant name but we have description, create a rule based on description
    elif transaction.description and category:
        try:
            categorization_service = CategorizationService(db)
            categorization_service.create_or_update_rule(
                user_id=current_user.id, 
                category_id=category.id,
                description_pattern=transaction.description
            )
        except Exception as e:
            print(f"Warning: Failed to update description-based rule for transaction {transaction_id}: {e}")

    db.commit()
    db.refresh(transaction)

    # Re-fetch the category object for the response based on the potentially updated category_id
    response_category_info = None
    if transaction.category_id:
        final_category = db.get(Category, transaction.category_id) # Use db.get for direct fetch by PK
        if final_category:
            response_category_info = CategoryInTransaction(
                id=final_category.id, 
                name=final_category.name, 
                user_id=final_category.user_id
            )

    return TransactionResponse(
        id=transaction.id,
        user_id=transaction.user_id,
        operation_date=transaction.operation_date,
        description=transaction.description,
        category=response_category_info, # Use potentially updated category info
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


def _get_expenses_summary_data(month: int, db: Session, current_user: User):
    summary = (
        db.query(
            Transaction.category_id,
            Category.name,
            func.sum(Transaction.amount).label('amount')
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(extract('month', Transaction.operation_date) == month)
        .group_by(Transaction.category_id, Category.name)
        .all()
    )

    categories = db.query(Category).join(Transaction, Category.id == Transaction.category_id).filter(extract('month', Transaction.operation_date) == month).all()
    limits = db.query(CategoryLimit).join(Plan).filter(
        CategoryLimit.category_id.in_([category.id for category in categories]),
        Plan.month == month,
        Plan.user_id == current_user.id
    ).all() 
    limits_dict = {limit.category_id: limit.limit for limit in limits}

    response_data = []
    for category in categories:
        expenses = abs(sum(item[2] for item in summary if item[0] == category.id))
        response_data.append({
            'category_id': category.id,
            'category_name': category.name,
            'expenses': expenses,
            'limit': limits_dict.get(category.id, 0),
            'month': month
        })

    return response_data


@router.get('/expenses_summary', response_model=list[TransactionSummaryResponse])
def get_expenses_summary(month: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_expenses_summary_data(month, db, current_user)


@router.get('/dashboard_summary', response_model=DashboardResponse)
def get_dashboard_summary(month: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    expenses_summary = get_expenses_summary(month=month, current_user=current_user, db=db)
    planned_amount = sum(item['limit'] for item in expenses_summary)
    spent_amount = sum(item['expenses'] for item in expenses_summary)
    total_savings = sum(max(item['limit'] - item['expenses'], 0) for item in expenses_summary)

    incomes = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        extract('month', Transaction.operation_date) == month,
        Transaction.amount > 0
    ).scalar() or 0  # Default to 0 if no incomes are found

    # Calculate spent today (negative amounts are expenses)
    today = datetime.utcnow().date()
    spent_today = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.operation_date == today,
        Transaction.amount < 0
    ).scalar() or 0
    spent_today = abs(spent_today)  # Convert to positive value for display

    # Calculate spent this month (all expenses for current month regardless of category)
    current_month = today.month
    current_year = today.year
    spent_this_month = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        extract('month', Transaction.operation_date) == current_month,
        extract('year', Transaction.operation_date) == current_year,
        Transaction.amount < 0
    ).scalar() or 0
    spent_this_month = abs(spent_this_month)  # Convert to positive value for display

    # Calculate spent this year (all expenses for current year)
    spent_this_year = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        extract('year', Transaction.operation_date) == current_year,
        Transaction.amount < 0
    ).scalar() or 0
    spent_this_year = abs(spent_this_year)  # Convert to positive value for display

    return DashboardResponse(
        planned_amount=planned_amount,
        spent_amount=spent_amount,
        total_savings=total_savings,
        incomes=incomes,
        spent_today=spent_today,
        spent_this_month=spent_this_month,
        spent_this_year=spent_this_year
    )


@router.delete('/categories/{category_id}', status_code=204)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_category = db.query(Category).filter(Category.id == category_id, Category.user_id == current_user.id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail='Category not found')
   
    db.delete(db_category)
    db.commit()


@router.get('/categories/{category_id}/main-categories', response_model=dict)
def get_main_categories_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all main categories associated with a specific category.
    """
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
        .first()
    )
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    main_categories = [
        MainCategoryResponse(
            id=mc.id,
            name=mc.name,
            user_id=mc.user_id
        ) for mc in category.main_categories
    ]
    
    return {"main_categories": main_categories}
