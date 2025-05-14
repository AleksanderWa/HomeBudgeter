from sqlalchemy.orm import Session
from typing import List, Optional
from ..models.transaction import Vault
from ..schemas.vault import VaultCreate, VaultUpdate
from decimal import Decimal


def get_vault_by_id(db: Session, vault_id: int, user_id: int) -> Optional[Vault]:
    return db.query(Vault).filter(Vault.id == vault_id, Vault.user_id == user_id).first()


def get_user_vault_entries(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Vault]:
    return db.query(Vault).filter(Vault.user_id == user_id).offset(skip).limit(limit).all()


def get_user_vault_balance(db: Session, user_id: int) -> Decimal:
    result = db.query(Vault).filter(Vault.user_id == user_id).all()
    total = sum(entry.amount for entry in result)
    return total


def create_vault_entry(db: Session, vault: VaultCreate, user_id: int) -> Vault:
    db_vault = Vault(**vault.dict(), user_id=user_id)
    db.add(db_vault)
    db.commit()
    db.refresh(db_vault)
    return db_vault


def update_vault_entry(db: Session, vault_id: int, vault: VaultUpdate, user_id: int) -> Optional[Vault]:
    db_vault = get_vault_by_id(db, vault_id, user_id)
    if not db_vault:
        return None
    
    update_data = vault.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_vault, key, value)
    
    db.commit()
    db.refresh(db_vault)
    return db_vault


def delete_vault_entry(db: Session, vault_id: int, user_id: int) -> bool:
    db_vault = get_vault_by_id(db, vault_id, user_id)
    if not db_vault:
        return False
    
    db.delete(db_vault)
    db.commit()
    return True 