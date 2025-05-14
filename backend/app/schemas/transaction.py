from typing import Optional
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
from ..models.transaction import TransactionType


class TransactionBase(BaseModel):
    description: str
    operation_date: date
    amount: Decimal
    category_id: Optional[int] = None
    transaction_type: Optional[TransactionType] = None
    
    class Config:
        orm_mode = True 