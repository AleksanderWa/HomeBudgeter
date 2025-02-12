from fastapi import FastAPI
from backend.app.routes import auth, transactions
from backend.app.database.database import engine
from backend.app.models import user, transaction
from fastapi.middleware.cors import CORSMiddleware

# user.Base.metadata.create_all(bind=engine)
# transaction.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(router=auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(router=transactions.router, prefix="/api/transactions", tags=["transactions"])

# Add CORS middleware if needed


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)