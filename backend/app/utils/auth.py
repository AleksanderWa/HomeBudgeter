import os
from datetime import datetime, timedelta

from backend.app.database.database import get_db
from backend.app.models.user import User
from backend.app.schemas.schemas import TokenData
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """
    Decode and validate the JWT token to get the current authenticated user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[os.getenv("JWT_ALGORITHM", "HS256")]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

        # Create TokenData object
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    # Fetch the user from the database
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception

    return user
