from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.database.database import get_db
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.schemas.schemas import TransactionBase, PaginatedTransactions
from datetime import datetime
import csv
import io
from typing import Optional, List
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from backend.app.utils.auth import get_current_user

router = APIRouter()


@router.put("/upload")
async def upload_transactions(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    contents = await file.read()
    text_contents = contents.decode('utf-8')
    csv_file = io.StringIO(text_contents)

    reader = csv.DictReader(csv_file, delimiter=';')

    transactions = []
    for row in reader:
        try:
            # Clean and convert amount to Decimal
            amount_str = row['#Kwota'].replace(' PLN', '').replace(',', '.').strip()
            amount = Decimal(amount_str).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        except (InvalidOperation, KeyError) as e:
            # Log the error or handle invalid amount
            print(f"Error processing amount: {amount_str}. Error: {e}")
            continue

        transactions.append(Transaction(
            operation_date=datetime.strptime(row['#Data operacji'], '%Y-%m-%d').date(),
            description=row['#Opis operacji'],
            account=row['#Rachunek'],
            category=row['#Kategoria'],
            amount=amount,
            user_id=current_user.id
        ))

    db.bulk_save_objects(transactions)
    db.commit()
    return {"message": f"{len(transactions)} transactions uploaded successfully"}


@router.get("/summary")
def get_summary(
    period: str = "month",
    top_n: Optional[int] = Query(None, description="Number of top categories to return (5 or 10)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get current date and start of period
    now = datetime.utcnow()
    period_start = None
    
    if period == "month":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        period_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Query to sum transactions by category
    query = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label('total_amount')
        )
        .filter(Transaction.user_id == current_user.id)
    )
    
    # Add period filter if specified
    if period_start:
        query = query.filter(Transaction.date >= period_start)
    
    # Group by category and order by total amount
    query = (
        query.group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    
    # Limit to top N if specified
    if top_n in [5, 10]:
        query = query.limit(top_n)
    
    results = query.all()
    
    # Format the response
    summary = {
        'categories': [
            {
                'category': result.category,
                'amount': float(result.total_amount)
            }
            for result in results
        ],
        'period': period,
        'from_date': period_start.isoformat() if period_start else None
    }
    
    return summary


@router.get("/", response_model=PaginatedTransactions)
def get_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch paginated transactions for the current user.
    
    - `page`: Page number (starts from 1)
    - `page_size`: Number of transactions per page (default 100, max 1000)
    
    Returns a list of transactions sorted by operation date in descending order.
    """
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Query transactions for the current user
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.operation_date))
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
    # Count total transactions for this user
    total_transactions = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == current_user.id)
        .scalar()
    )
    
    # Calculate total pages
    total_pages = (total_transactions + page_size - 1) // page_size
    
    return {
        "transactions": transactions,
        "page": page,
        "page_size": page_size,
        "total_transactions": total_transactions,
        "total_pages": total_pages
    }