from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.database import Base
from .user import User # Import User model
from .transaction import Category # Import Category model


class CategorizationRule(Base):
    __tablename__ = "categorization_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant_name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    user = relationship("User") # Assuming User has a relationship back
    category = relationship("Category", back_populates="categorization_rules")

    __table_args__ = (
        UniqueConstraint('user_id', 'merchant_name', name='_user_merchant_uc'),
        Index('ix_categorization_rules_user_merchant', 'user_id', 'merchant_name'), # Index for efficient lookups
    ) 