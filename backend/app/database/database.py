# from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy.ext.declarative import declarative_base
# import os
# from dotenv import load_dotenv
#
# load_dotenv()
#
# # Use asyncpg for PostgreSQL
# DATABASE_URL = os.getenv("DATABASE_URL").replace("postgresql://", "postgresql+asyncpg://")
#
# # Create async session
# engine = create_async_engine(
#     DATABASE_URL,
#     echo=False,
#     future=True,
#     # connect_args=connect_args,
# )
#
# Base = declarative_base()
#
# AsyncSessionLocal = sessionmaker(
#     bind=engine, class_=AsyncSession, expire_on_commit=False
# )
#
# # Dependency to get the async database session
# async def get_db() -> AsyncSession:
#     async with AsyncSessionLocal() as session:
#         try:
#             yield session
#             await session.commit()
#             await session.close()
#         except Exception as e:
#             await session.rollback()
#             raise e
#         finally:
#             await session.close()

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@0.0.0.0:5432/budgeteer")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()