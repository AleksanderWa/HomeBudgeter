from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from backend.app.database.database import get_db
from backend.app.models.transaction import MainCategory, Category
from backend.app.models.user import User
from backend.app.schemas.schemas import (
    MainCategoryCreate,
    MainCategoryResponse,
    MainCategoryDetailResponse,
    CategoryResponse
)
from backend.app.utils.auth import get_current_user

router = APIRouter()


@router.post("", response_model=MainCategoryResponse)
def create_main_category(
    main_category_data: MainCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new main category for the current user.
    """
    try:
        # Normalize category name (strip whitespace, convert to title case)
        normalized_name = main_category_data.name.strip()

        # Check if main category already exists for this user
        existing_main_category = (
            db.query(MainCategory)
            .filter(
                func.lower(MainCategory.name) == func.lower(normalized_name),
                MainCategory.user_id == current_user.id,
            )
            .first()
        )

        if existing_main_category:
            raise HTTPException(
                status_code=400, detail=f"Main category '{normalized_name}' already exists"
            )

        # Create new main category
        new_main_category_db = MainCategory(name=normalized_name, user_id=current_user.id)

        # Add and commit
        db.add(new_main_category_db)
        db.commit()
        db.refresh(new_main_category_db)

        # Convert to Pydantic model
        new_main_category = MainCategoryResponse(
            id=new_main_category_db.id,
            name=new_main_category_db.name,
            user_id=new_main_category_db.user_id
        )

        return new_main_category

    except IntegrityError:
        # Rollback in case of database integrity error
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Could not create main category due to database constraints"
        )


@router.get("", response_model=dict)
def get_main_categories(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all main categories for the current user.
    """
    main_categories_db = (
        db.query(MainCategory)
        .filter(MainCategory.user_id == current_user.id)
        .all()
    )
    
    # Convert SQLAlchemy models to Pydantic models
    main_categories = [
        MainCategoryResponse(
            id=mc.id,
            name=mc.name,
            user_id=mc.user_id
        ) for mc in main_categories_db
    ]
    
    return {"main_categories": main_categories}


@router.get("/{main_category_id}", response_model=MainCategoryDetailResponse)
def get_main_category(
    main_category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve a specific main category by ID.
    """
    main_category_db = (
        db.query(MainCategory)
        .filter(
            MainCategory.id == main_category_id,
            MainCategory.user_id == current_user.id
        )
        .first()
    )
    
    if not main_category_db:
        raise HTTPException(status_code=404, detail="Main category not found")
    
    # Convert categories to Pydantic models
    categories = [
        CategoryResponse(
            id=cat.id,
            name=cat.name,
            user_id=cat.user_id,
            main_categories=[mc.id for mc in cat.main_categories]
        ) for cat in main_category_db.categories
    ]
    
    # Create the response
    main_category = MainCategoryDetailResponse(
        id=main_category_db.id,
        name=main_category_db.name,
        user_id=main_category_db.user_id,
        categories=categories
    )
    
    return main_category


@router.patch("/{main_category_id}", response_model=MainCategoryResponse)
def update_main_category(
    main_category_id: int,
    main_category_data: MainCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing main category.
    """
    main_category_db = (
        db.query(MainCategory)
        .filter(
            MainCategory.id == main_category_id,
            MainCategory.user_id == current_user.id
        )
        .first()
    )
    
    if not main_category_db:
        raise HTTPException(status_code=404, detail="Main category not found")
    
    try:
        # Normalize name
        normalized_name = main_category_data.name.strip()
        
        # Check if the new name already exists for this user (excluding the current main category)
        existing_main_category = (
            db.query(MainCategory)
            .filter(
                func.lower(MainCategory.name) == func.lower(normalized_name),
                MainCategory.user_id == current_user.id,
                MainCategory.id != main_category_id
            )
            .first()
        )
        
        if existing_main_category:
            raise HTTPException(
                status_code=400, detail=f"Main category '{normalized_name}' already exists"
            )
            
        # Update the main category
        main_category_db.name = normalized_name
        db.commit()
        db.refresh(main_category_db)
        
        # Convert to Pydantic model
        main_category = MainCategoryResponse(
            id=main_category_db.id,
            name=main_category_db.name,
            user_id=main_category_db.user_id
        )
        
        return main_category
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="Could not update main category due to database constraints"
        )


@router.delete("/{main_category_id}", status_code=204)
def delete_main_category(
    main_category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a main category.
    """
    main_category = (
        db.query(MainCategory)
        .filter(
            MainCategory.id == main_category_id,
            MainCategory.user_id == current_user.id
        )
        .first()
    )
    
    if not main_category:
        raise HTTPException(status_code=404, detail="Main category not found")
    
    # Remove the main category (associations will be automatically removed due to SQLAlchemy relationship)
    db.delete(main_category)
    db.commit()
    
    return None


@router.get("/{main_category_id}/categories", response_model=dict)
def get_categories_by_main_category(
    main_category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all categories associated with a specific main category.
    """
    main_category_db = (
        db.query(MainCategory)
        .filter(
            MainCategory.id == main_category_id,
            MainCategory.user_id == current_user.id
        )
        .first()
    )
    
    if not main_category_db:
        raise HTTPException(status_code=404, detail="Main category not found")
    
    categories = [
        CategoryResponse(
            id=category.id,
            name=category.name,
            user_id=category.user_id,
            main_categories=[mc.id for mc in category.main_categories]
        )
        for category in main_category_db.categories
    ]
    
    return {"categories": categories}


@router.post("/{main_category_id}/categories/{category_id}", status_code=200)
def add_category_to_main_category(
    main_category_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Associate a category with a main category.
    """
    main_category = (
        db.query(MainCategory)
        .filter(
            MainCategory.id == main_category_id,
            MainCategory.user_id == current_user.id
        )
        .first()
    )
    
    if not main_category:
        raise HTTPException(status_code=404, detail="Main category not found")
    
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
    
    # Check if the association already exists
    if main_category in category.main_categories:
        return None
    
    # Add the association
    category.main_categories.append(main_category)
    db.commit()
    
    return None


@router.delete("/{main_category_id}/categories/{category_id}", status_code=204)
def remove_category_from_main_category(
    main_category_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove a category from a main category.
    """
    main_category = (
        db.query(MainCategory)
        .filter(
            MainCategory.id == main_category_id,
            MainCategory.user_id == current_user.id
        )
        .first()
    )
    
    if not main_category:
        raise HTTPException(status_code=404, detail="Main category not found")
    
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
    
    # Check if the association exists
    if main_category not in category.main_categories:
        return None
    
    # Remove the association
    category.main_categories.remove(main_category)
    db.commit()
    
    return None 