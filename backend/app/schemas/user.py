from pydantic import BaseModel, EmailStr, Field, field_validator # type: ignore
from datetime import datetime
from typing import Literal


def _validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not any(c.isalpha() for c in password):
        raise ValueError("Password must include at least one letter")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must include at least one number")
    if len(set(password)) == 1:
        raise ValueError("Password cannot be a single repeated character")
    return password


# Data coming from user during registration
class UserCreate(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["admin", "employee"]

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return _validate_password_strength(v)


# Data returned from API
class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1)
    last_name: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8)
    role: Literal["admin", "employee"] | None = None

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_password_strength(v)