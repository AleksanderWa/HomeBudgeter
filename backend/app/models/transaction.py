from ..database.database import Base
from sqlalchemy import Column, Date, ForeignKey, Integer, String, UniqueConstraint, DateTime, Index
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


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    user = relationship("User")
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
