from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, Any, List, Optional
from ..models.transaction import TransactionFilterRule


class TransactionFilterService:
    def __init__(self, db: Session):
        self.db = db
    
    def should_skip_transaction(self, user_id: int, tx_data: Dict[str, Any]) -> bool:
        """
        Check if a transaction should be skipped based on user's filter rules.
        
        Args:
            user_id: The ID of the user
            tx_data: The transaction data (either raw from bank API or formatted)
            
        Returns:
            bool: True if transaction should be skipped, False otherwise
        """
        # Get all active filter rules for this user
        rules = self.db.query(TransactionFilterRule).filter(
            TransactionFilterRule.user_id == user_id,
            TransactionFilterRule.is_active == True
        ).all()
        
        if not rules:
            return False  # No rules, don't skip
        
        # Check each rule to see if it applies
        for rule in rules:
            if self._rule_matches_transaction(rule, tx_data):
                return True  # Skip this transaction
                
        return False  # No matching rules, don't skip
    
    def _rule_matches_transaction(self, rule: TransactionFilterRule, tx_data: Dict[str, Any]) -> bool:
        """
        Check if a particular rule matches the transaction.
        """
        # Check description pattern filter
        if rule.description_pattern and 'description' in tx_data:
            if rule.description_pattern in tx_data['description']:
                return True
                
        # Check merchant name filter
        if rule.merchant_name and 'merchant_name' in tx_data:
            if tx_data['merchant_name'] and rule.merchant_name in tx_data['merchant_name']:
                return True
                
        # Check amount range filters
        if ('amount' in tx_data) and (tx_data['amount'] is not None):
            amount = Decimal(str(tx_data['amount'])) if not isinstance(tx_data['amount'], Decimal) else tx_data['amount']
            
            # Apply min amount filter (if set)
            if rule.min_amount is not None:
                if abs(amount) >= rule.min_amount:
                    if rule.max_amount is None:
                        return True  # Only min_amount is set and it matches
            
            # Apply max amount filter (if set)
            if rule.max_amount is not None:
                if abs(amount) <= rule.max_amount:
                    if rule.min_amount is None:
                        return True  # Only max_amount is set and it matches
            
            # Apply range filter (if both min and max are set)
            if rule.min_amount is not None and rule.max_amount is not None:
                if rule.min_amount <= abs(amount) <= rule.max_amount:
                    return True  # Amount is within range
        
        return False  # Rule doesn't match
    
    def create_filter_rule(
        self, 
        user_id: int, 
        description_pattern: Optional[str] = None,
        merchant_name: Optional[str] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None
    ) -> TransactionFilterRule:
        """
        Create a new transaction filter rule.
        
        Args:
            user_id: The ID of the user
            description_pattern: Optional pattern to match in transaction descriptions
            merchant_name: Optional merchant name to filter
            min_amount: Optional minimum transaction amount
            max_amount: Optional maximum transaction amount
            
        Returns:
            The created rule
        """
        # Ensure at least one filter criterion is provided
        if not any([description_pattern, merchant_name, min_amount, max_amount]):
            raise ValueError("At least one filter criterion must be provided")
        
        rule = TransactionFilterRule(
            user_id=user_id,
            description_pattern=description_pattern,
            merchant_name=merchant_name,
            min_amount=min_amount,
            max_amount=max_amount
        )
        
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return rule
    
    def update_filter_rule(
        self,
        rule_id: int,
        user_id: int,
        description_pattern: Optional[str] = None,
        merchant_name: Optional[str] = None,
        min_amount: Optional[Decimal] = None,
        max_amount: Optional[Decimal] = None,
        is_active: Optional[bool] = None
    ) -> Optional[TransactionFilterRule]:
        """
        Update an existing filter rule.
        
        Returns:
            The updated rule or None if not found
        """
        rule = self.db.query(TransactionFilterRule).filter(
            TransactionFilterRule.id == rule_id,
            TransactionFilterRule.user_id == user_id
        ).first()
        
        if not rule:
            return None
            
        # Update provided fields
        if description_pattern is not None:
            rule.description_pattern = description_pattern
        if merchant_name is not None:
            rule.merchant_name = merchant_name
        if min_amount is not None:
            rule.min_amount = min_amount
        if max_amount is not None:
            rule.max_amount = max_amount
        if is_active is not None:
            rule.is_active = is_active
            
        # Ensure at least one criterion is still set
        if not any([
            rule.description_pattern, 
            rule.merchant_name, 
            rule.min_amount is not None, 
            rule.max_amount is not None
        ]):
            raise ValueError("At least one filter criterion must be provided")
            
        self.db.commit()
        self.db.refresh(rule)
        return rule
    
    def delete_filter_rule(self, rule_id: int, user_id: int) -> bool:
        """
        Delete a filter rule.
        
        Returns:
            True if deleted, False if not found
        """
        rule = self.db.query(TransactionFilterRule).filter(
            TransactionFilterRule.id == rule_id,
            TransactionFilterRule.user_id == user_id
        ).first()
        
        if not rule:
            return False
            
        self.db.delete(rule)
        self.db.commit()
        return True
    
    def get_filter_rules(self, user_id: int) -> List[TransactionFilterRule]:
        """
        Get all filter rules for a user.
        """
        return self.db.query(TransactionFilterRule).filter(
            TransactionFilterRule.user_id == user_id
        ).all() 