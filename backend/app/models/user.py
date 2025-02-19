from ..database.database import Base
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    plans = relationship('Plan', back_populates='user')
    category_limits = relationship('CategoryLimit', back_populates='user')
