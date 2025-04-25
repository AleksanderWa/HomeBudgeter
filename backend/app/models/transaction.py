from ..database.database import Base
from sqlalchemy import Column, Date, ForeignKey, Integer, String, UniqueConstraint, DateTime, Index, Table, CheckConstraint, Boolean
from sqlalchemy.types import DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime


class BankConnection(Base):
    __tablename__ = "bank_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(String)
    provider_name = Column(String)
    access_token = Column(String)
    refresh_token = Column(String)
    token_expires_at = Column(DateTime)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Association table for many-to-many relationship between Category and MainCategory
category_main_category = Table(
    "category_main_category",
    Base.metadata,
    Column("category_id", Integer, ForeignKey("categories.id"), primary_key=True),
    Column("main_category_id", Integer, ForeignKey("main_categories.id"), primary_key=True)
)


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    operation_date = Column(Date)
    description = Column(String)
    # account = Column(String)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    amount = Column(DECIMAL(precision=10, scale=2), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # New fields for bank integration
    bank_transaction_id = Column(String, unique=True, nullable=True)
    account_name = Column(String, nullable=True)
    merchant_name = Column(String, nullable=True, index=True)
    transaction_type = Column(String, nullable=True)
    bank_connection_id = Column(Integer, ForeignKey("bank_connections.id"), nullable=True)

    # Relationships
    user = relationship("User")
    bank_connection = relationship("BankConnection")
    category = relationship("Category", back_populates="transactions")


class MainCategory(Base):
    __tablename__ = "main_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user = relationship("User")
    categories = relationship("Category", secondary=category_main_category, back_populates="main_categories")

    __table_args__ = (
        UniqueConstraint('name', 'user_id', name='_main_category_name_user_uc'),
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    user = relationship("User")
    main_categories = relationship("MainCategory", secondary=category_main_category, back_populates="categories")
    category_limits = relationship('CategoryLimit', back_populates='category')
    transactions = relationship("Transaction", back_populates="category")
    categorization_rules = relationship("CategorizationRule", back_populates="category")

    __table_args__ = (
        UniqueConstraint('name', 'user_id', name='_category_name_user_uc'),
    )


class Plan(Base):
    __tablename__ = 'plans'

    id = Column(Integer, primary_key=True, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    user = relationship('User', back_populates='plans')
    category_limits = relationship('CategoryLimit', back_populates='plan')
    incomes = relationship('PlanIncome', back_populates='plan')


class CategoryLimit(Base):
    __tablename__ = 'category_limits'

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=False)
    limit = Column(DECIMAL(precision=10, scale=2), nullable=False)

    __table_args__ = (
        UniqueConstraint('category_id', 'plan_id', name='_category_plan_uc'),
    )

    plan = relationship('Plan', back_populates='category_limits')
    category = relationship('Category', back_populates='category_limits')
    user = relationship('User', back_populates='category_limits')


class PlanIncome(Base):
    __tablename__ = 'plan_incomes'

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount = Column(DECIMAL(precision=10, scale=2), nullable=False, default=0)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plan = relationship('Plan', back_populates='incomes')
    user = relationship('User', back_populates='plan_incomes')

    __table_args__ = (
        UniqueConstraint('plan_id', 'user_id', name='_plan_user_income_uc'),
    )


class TransactionFilterRule(Base):
    __tablename__ = "transaction_filter_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Filter criteria - at least one must be provided
    description_pattern = Column(String, nullable=True)  # Text pattern in transaction description
    merchant_name = Column(String, nullable=True)        # Merchant name to filter
    min_amount = Column(DECIMAL(precision=10, scale=2), nullable=True)  # Min amount to filter
    max_amount = Column(DECIMAL(precision=10, scale=2), nullable=True)  # Max amount to filter
    
    is_active = Column(Boolean, default=True)  # Allow disabling rules without deletion
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        # Ensure at least one filter criterion is provided
        CheckConstraint(
            "description_pattern IS NOT NULL OR merchant_name IS NOT NULL OR min_amount IS NOT NULL OR max_amount IS NOT NULL",
            name="check_at_least_one_filter_criterion"
        ),
        # Create unique indexes for efficient lookups
        UniqueConstraint('user_id', 'description_pattern', name='_user_desc_filter_uc'),
        UniqueConstraint('user_id', 'merchant_name', name='_user_merchant_filter_uc'),
        Index('ix_filter_rules_user_id', 'user_id'),
    )
