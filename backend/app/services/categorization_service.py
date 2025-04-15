from sqlalchemy.orm import Session
from sqlalchemy import select, update, insert
from ..models import Transaction, CategorizationRule, Category
from typing import Optional


class CategorizationService:

    def __init__(self, db: Session):
        self.db = db

    def apply_category_to_transaction(self, transaction: Transaction) -> Optional[int]:
        """Attempts to find a rule and apply a category to a transaction. Does NOT commit."""
        if not transaction.merchant_name or not transaction.user_id:
            return None  # Cannot apply rule without merchant name or user

        # Find existing rule
        rule = self.find_rule(transaction.user_id, transaction.merchant_name)

        if rule:
            transaction.category_id = rule.category_id
            # No commit here - let the caller handle it.
            # Ensure the transaction object is managed by the session if needed by the caller.
            # If the transaction is already in the session or will be added later, this is fine.
            return rule.category_id

        return None  # No rule found

    def learn_and_apply_category(
        self, transaction_id: int, category_id: int, user_id: int
    ) -> None:
        """Updates a transaction's category and creates/updates the corresponding rule."""
        transaction = self.db.get(Transaction, transaction_id)
        if not transaction or transaction.user_id != user_id:
            # Handle error: Transaction not found or not owned by user
            # Consider raising an HTTPException or returning an error status
            return

        if not transaction.merchant_name:
            # Optionally update the category even if no merchant name for learning
            transaction.category_id = category_id
            self.db.add(transaction)
            self.db.commit()
            # Log a warning or inform the user that a rule couldn't be created
            return

        # Update transaction's category
        transaction.category_id = category_id
        self.db.add(transaction)  # Ensure transaction is in the session

        # Upsert the rule (Create or Update)
        self.create_or_update_rule(user_id, transaction.merchant_name, category_id)

        self.db.commit()  # Commit both transaction update and rule upsert

    def find_rule(
        self, user_id: int, merchant_name: str
    ) -> Optional[CategorizationRule]:
        """Finds a specific categorization rule."""
        stmt = select(CategorizationRule).where(
            CategorizationRule.user_id == user_id,
            CategorizationRule.merchant_name == merchant_name,
        )
        result = self.db.execute(stmt)
        return result.scalar_one_or_none()

    def create_or_update_rule(
        self, user_id: int, merchant_name: str, category_id: int
    ) -> None:
        """Creates a new rule or updates an existing one for the user/merchant."""
        # Check if category exists and belongs to the user (or is global)
        category = self.db.get(Category, category_id)
        if not category or (
            category.user_id is not None and category.user_id != user_id
        ):
            # Handle error: Invalid category
            # Consider raising an exception
            return

        # Use SQLAlchemy's upsert capabilities or a simple select-then-insert/update
        existing_rule = self.find_rule(user_id, merchant_name)

        if existing_rule:
            # Update existing rule
            if existing_rule.category_id != category_id:
                existing_rule.category_id = category_id
                self.db.add(existing_rule)
        else:
            # Create new rule
            new_rule = CategorizationRule(
                user_id=user_id, merchant_name=merchant_name, category_id=category_id
            )
            self.db.add(new_rule)

        # Commit is handled by the calling function (e.g., learn_and_apply_category)
