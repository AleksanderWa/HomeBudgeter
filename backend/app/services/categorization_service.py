from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from ..models import Transaction, CategorizationRule, Category
from typing import Optional, List, Tuple


class CategorizationService:

    def __init__(self, db: Session):
        self.db = db

    def apply_category_to_transaction(self, transaction: Transaction) -> Optional[int]:
        """Attempts to find a rule and apply a category to a transaction. Does NOT commit."""
        if not transaction.user_id:
            return None  # Cannot apply rule without user

        # Try to find a rule that matches merchant name or description
        rule = self.find_matching_rule(transaction)

        if rule:
            transaction.category_id = rule.category_id
            # No commit here - let the caller handle it.
            # Ensure the transaction object is managed by the session if needed by the caller.
            # If the transaction is already in the session or will be added later, this is fine.
            return rule.category_id

        return None  # No rule found

    def find_matching_rule(self, transaction: Transaction) -> Optional[CategorizationRule]:
        """Find a rule that matches either merchant name or description pattern."""
        if not transaction.user_id:
            return None
            
        conditions = []
        
        # Add merchant name condition if available
        if transaction.merchant_name:
            conditions.append(
                (CategorizationRule.user_id == transaction.user_id) &
                (CategorizationRule.merchant_name == transaction.merchant_name)
            )
            
        # Add description pattern condition if available
        if transaction.description:
            # First try for exact description match
            conditions.append(
                (CategorizationRule.user_id == transaction.user_id) &
                (CategorizationRule.description_pattern == transaction.description)
            )
            
            # Then try partial matches - find rules with description patterns
            # that are contained within the transaction description
            # This requires a more complex query using LIKE or ILIKE in SQL
            description_rules = self.db.query(CategorizationRule).filter(
                CategorizationRule.user_id == transaction.user_id,
                CategorizationRule.description_pattern.isnot(None)
            ).all()
            
            for rule in description_rules:
                if rule.description_pattern and rule.description_pattern in transaction.description:
                    return rule
        
        # If we have conditions, execute the query
        if conditions:
            stmt = select(CategorizationRule).where(or_(*conditions))
            result = self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        return None

    def learn_and_apply_category(
        self, transaction_id: int, category_id: int, user_id: int
    ) -> None:
        """Updates a transaction's category and creates/updates the corresponding rule."""
        transaction = self.db.get(Transaction, transaction_id)
        if not transaction or transaction.user_id != user_id:
            # Handle error: Transaction not found or not owned by user
            # Consider raising an HTTPException or returning an error status
            return

        # Update transaction's category
        transaction.category_id = category_id
        self.db.add(transaction)  # Ensure transaction is in the session

        # Create or update rule based on available data
        if transaction.merchant_name:
            # If we have a merchant name, use that for the rule
            self.create_or_update_rule(
                user_id=user_id, 
                merchant_name=transaction.merchant_name, 
                description_pattern=None,
                category_id=category_id
            )
        elif transaction.description:
            # If no merchant name but we have a description, use that
            self.create_or_update_rule(
                user_id=user_id, 
                merchant_name=None, 
                description_pattern=transaction.description,
                category_id=category_id
            )
        else:
            # If neither merchant name nor description, just update the transaction without creating a rule
            pass
        
        self.db.commit()  # Commit both transaction update and rule upsert

    def find_rule(
        self, user_id: int, merchant_name: str = None, description_pattern: str = None
    ) -> Optional[CategorizationRule]:
        """Finds a specific categorization rule by merchant name or description pattern."""
        if not merchant_name and not description_pattern:
            return None
            
        conditions = []
        if merchant_name:
            conditions.append(
                (CategorizationRule.user_id == user_id) &
                (CategorizationRule.merchant_name == merchant_name)
            )
        if description_pattern:
            conditions.append(
                (CategorizationRule.user_id == user_id) &
                (CategorizationRule.description_pattern == description_pattern)
            )
            
        if conditions:
            stmt = select(CategorizationRule).where(or_(*conditions))
            result = self.db.execute(stmt)
            return result.scalar_one_or_none()
            
        return None

    def create_or_update_rule(
        self, user_id: int, category_id: int, merchant_name: str = None, description_pattern: str = None
    ) -> None:
        """Creates a new rule or updates an existing one for the user/merchant or description."""
        if not merchant_name and not description_pattern:
            return  # Need at least one criterion to create a rule
            
        # Check if category exists and belongs to the user (or is global)
        category = self.db.get(Category, category_id)
        if not category or (
            category.user_id is not None and category.user_id != user_id
        ):
            # Handle error: Invalid category
            # Consider raising an exception
            return
        
        # Find existing rule
        existing_rule = self.find_rule(
            user_id, merchant_name=merchant_name, description_pattern=description_pattern
        )

        if existing_rule:
            # Update existing rule
            if existing_rule.category_id != category_id:
                existing_rule.category_id = category_id
                self.db.add(existing_rule)
        else:
            # Create new rule
            new_rule = CategorizationRule(
                user_id=user_id,
                merchant_name=merchant_name,
                description_pattern=description_pattern,
                category_id=category_id
            )
            self.db.add(new_rule)

        # Commit is handled by the calling function (e.g., learn_and_apply_category)
