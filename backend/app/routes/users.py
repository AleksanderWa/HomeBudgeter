from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.schemas.schemas import UserCreate, UserResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_details(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """
    Get details of the currently authenticated user.
    """
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
        user_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific user by ID (admin-only).
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user