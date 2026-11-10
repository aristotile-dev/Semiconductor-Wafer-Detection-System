import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db, User

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    import secrets
    SECRET_KEY = secrets.token_urlsafe(48)
    print("[auth] SECRET_KEY is not set. Using a random key; everyone is signed out on every restart. Set SECRET_KEY as a secret.")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


ACTION_TOKEN_DAYS = 7


def create_action_token(request_id: int, action: str) -> str:
    """Signed token for the approve/reject links in the admin email."""
    exp = datetime.utcnow() + timedelta(days=ACTION_TOKEN_DAYS)
    return jwt.encode({"rid": request_id, "act": action, "pur": "access-request", "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def read_action_token(token: str) -> tuple[int, str]:
    try:
        p = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if p.get("pur") != "access-request" or p.get("act") not in ("approve", "reject"):
            raise ValueError
        return int(p["rid"]), p["act"]
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=400, detail="This link is invalid or has expired.")
