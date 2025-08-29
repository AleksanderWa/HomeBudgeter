from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from ..database.database import get_db
from backend.app.schemas.vault import (
    Vault,
    VaultCreate,
    VaultUpdate,
    VaultBalanceResponse
)
from backend.app.crud import vault as vault_crud
from backend.app.utils.auth import get_current_user
from backend.app.models.user import User


router = APIRouter(
    prefix="/api/vault",
    tags=["vault"],
)


@router.get("", response_model=VaultBalanceResponse)
def get_vault_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current vault balance"""
    balance = vault_crud.get_user_vault_balance(db, current_user.id)
    return {"amount": balance, "description": "Current vault balance"}


@router.get("/history", response_model=List[Vault])
def get_vault_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vault transaction history"""
    return vault_crud.get_user_vault_entries(db, current_user.id, skip, limit)


@router.post("", response_model=Vault, status_code=status.HTTP_201_CREATED)
def create_vault_entry(
    vault: VaultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add cash to vault"""
    return vault_crud.create_vault_entry(db, vault, current_user.id)


@router.put("/{vault_id}", response_model=Vault)
def update_vault_entry(
    vault_id: int,
    vault: VaultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """Update vault entry"""
    db_vault = vault_crud.update_vault_entry(db, vault_id, vault, current_user.id)
    if db_vault is None:
        raise HTTPException(status_code=404, detail="Vault entry not found")
    return db_vault


@router.delete("/{vault_id}")
def delete_vault_entry(
    vault_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete vault entry"""
    success = vault_crud.delete_vault_entry(db, vault_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Vault entry not found")
    return {"detail": "Vault entry deleted successfully"} 