from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class VaultBase(BaseModel):
    amount: Decimal
    description: Optional[str] = None


class VaultCreate(VaultBase):
    pass


class VaultUpdate(VaultBase):
    amount: Optional[Decimal] = None


class VaultBalanceResponse(BaseModel):
    amount: Decimal
    description: str


class VaultInDB(VaultBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class Vault(VaultInDB):
    pass 