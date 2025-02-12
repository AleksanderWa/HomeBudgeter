from backend.app.database.database import Base
from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String

# from app.database.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    operation_date = Column(Date)
    description = Column(String)
    account = Column(String)
    category = Column(String)
    amount = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))
