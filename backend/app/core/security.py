import time
import uuid

from passlib.context import CryptContext  # type: ignore
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Request, status  # type: ignore
from fastapi.security import OAuth2PasswordBearer  # type: ignore
from jose import JWTError, jwt  # type: ignore
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

COOKIE_NAME = "access_token"

# Password hashing configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# Hash password
def hash_password(password: str):
    return pwd_context.hash(password)


# Verify password
def verify_password(
    plain_password: str,
    hashed_password: str
):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ---------------------------------------------------------------------------
# Token revocation (logout blacklist)
#
# JWTs are stateless by design, so logging out can't truly "delete" one --
# the token stays cryptographically valid until it expires. To make logout
# actually revoke access (rather than just tell the client to forget the
# token), every token gets a unique `jti`, and logout adds that jti to a
# blacklist that get_current_user checks on every request. Entries are
# dropped once the token they belong to would have expired anyway, so this
# stays small.
#
# In-memory + single-process, same tradeoff as the rate limiter: fine for
# one server instance, swap for a shared store (Redis, DB table) if you
# scale horizontally.
# ---------------------------------------------------------------------------
_revoked_jtis: dict[str, float] = {}


def _prune_revoked():
    now = time.time()
    expired = [jti for jti, exp in _revoked_jtis.items() if exp <= now]
    for jti in expired:
        _revoked_jtis.pop(jti, None)


def revoke_jti(jti: str, expires_at: float):
    _prune_revoked()
    _revoked_jtis[jti] = expires_at


def is_revoked(jti: str | None) -> bool:
    if jti is None:
        return False
    _prune_revoked()
    return jti in _revoked_jtis


# Create JWT token
def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": uuid.uuid4().hex,
        }
    )

    token = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


# Bearer scheme kept for API clients / tests that authenticate with an
# Authorization header. auto_error=False so a request can fall back to the
# httpOnly cookie the browser frontend uses instead.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login",
    auto_error=False,
)


def _extract_token(request: Request, header_token: str | None) -> str | None:
    if header_token:
        return header_token
    return request.cookies.get(COOKIE_NAME)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_current_user(
    request: Request,
    header_token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )

    token = _extract_token(request, header_token)

    if not token:
        raise credentials_exception

    try:

        payload = decode_token(token)

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        if is_revoked(payload.get("jti")):
            raise credentials_exception

    except JWTError:

        raise credentials_exception

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise credentials_exception
    user = db.query(User).filter(
        User.id == user_id_int,
        User.is_deleted == False
    ).first()


    if user is None:
        raise credentials_exception


    return user


def admin_required(
    current_user: User = Depends(get_current_user)
):

    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can perform this action."
        )

    return current_user