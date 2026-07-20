from fastapi import APIRouter, Depends, HTTPException, Request, Response  # type: ignore
from sqlalchemy.orm import Session
from app.core.security import verify_password, create_access_token
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.core.security import hash_password
from app.core.security import get_current_user
from app.core.security import admin_required
from app.core.security import (
    COOKIE_NAME,
    decode_token,
    revoke_jti,
)
from app.core.config import COOKIE_SECURE
from fastapi.security import OAuth2PasswordRequestForm  # type: ignore
from app.core.rate_limit import rate_limit_login
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


def _set_auth_cookie(response: Response, token: str):
    # httpOnly: JavaScript can never read this, so a stray XSS bug can no
    # longer walk off with the session token the way it could when the
    # token lived in sessionStorage.
    # SameSite=lax: browser won't attach the cookie to cross-site POSTs,
    # which covers the common CSRF case for a same-site SPA + API setup.
    # Secure: only sent over HTTPS once ENVIRONMENT=production (see
    # app.core.config.COOKIE_SECURE) -- kept off for plain-HTTP local dev.
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=60 * 60,
        path="/",
    )


@router.post(
    "/register",
    response_model=UserResponse
)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(admin_required)
):

    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # Create new user object
    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role
    )


    # Save to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)


    return new_user


@router.post("/login")
def login_user(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _rate_limit=Depends(rate_limit_login)
):

    # username will contain email
    db_user = db.query(User).filter(
        User.email == form_data.username,
        User.is_deleted == False
    ).first()

    # SECURITY: deliberately identical outcome (status code + message) for
    # "no such user" and "wrong password". Distinguishing them (previously
    # 404 vs 401) lets an attacker enumerate every valid employee email by
    # scripting login attempts and watching which ones come back 404 vs 401.
    invalid_credentials = HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )

    if not db_user:
        raise invalid_credentials

    if not verify_password(
        form_data.password,
        db_user.password_hash
    ):
        raise invalid_credentials


    access_token = create_access_token(
        {
            "sub": str(db_user.id),
            "email": db_user.email,
            "role": db_user.role
        }
    )

    _set_auth_cookie(response, access_token)

    # Token is still returned in the body for non-browser API clients
    # (scripts, tests, mobile apps) that can't rely on cookie storage.
    # The browser frontend ignores this field and relies on the httpOnly
    # cookie set above instead.
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
def get_profile(
    current_user: User = Depends(get_current_user)
):

    return current_user

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user)
):

    # Actually revoke the token instead of just asking the client to
    # forget it -- otherwise a stolen bearer token stays valid for the
    # rest of its lifetime even after the legitimate user "logs out".
    header_auth = request.headers.get("Authorization", "")
    token = None
    if header_auth.lower().startswith("bearer "):
        token = header_auth[7:]
    else:
        token = request.cookies.get(COOKIE_NAME)

    if token:
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                revoke_jti(jti, float(exp))
        except Exception:
            pass

    response.delete_cookie(COOKIE_NAME, path="/")

    return {
        "message": "Logout successful"
    }