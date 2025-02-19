from ..database.database import Base
from sqlalchemy import Column, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.types import DECIMAL
from sqlalchemy.orm import relationship


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    operation_date = Column(Date)
    description = Column(String)
    # account = Column(String)
    category = Column(Integer, ForeignKey("categories.id"))
    amount = Column(DECIMAL(precision=10, scale=2), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_limits = relationship('CategoryLimit', back_populates='category')


class Plan(Base):
    __tablename__ = 'plans'

    id = Column(Integer, primary_key=True, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)

    user = relationship('User', back_populates='plans')
    category_limits = relationship('CategoryLimit', back_populates='plan')


class CategoryLimit(Base):
    __tablename__ = 'category_limits'

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('categories.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    plan_id = Column(Integer, ForeignKey('plans.id'), nullable=False)

    __table_args__ = (
        UniqueConstraint('category_id', 'plan_id', name='_category_plan_uc'),
    )

    plan = relationship('Plan', back_populates='category_limits')
    category = relationship('Category', back_populates='category_limits')
    user = relationship('User', back_populates='category_limits')
