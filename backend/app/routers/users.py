from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate
)
from app.core.security import (
    get_current_user,
    admin_required,
    hash_password
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get(
    "/",
    response_model=list[UserResponse]
)
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    users = db.query(User).filter(
        User.is_deleted == False
    ).all()

    return users

@router.get(
    "/{user_id}",
    response_model=UserResponse
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()


    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    return user

# Create User (Admin)
@router.post(
    "/",
    response_model=UserResponse
)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    # Check duplicate email
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role
    )


    db.add(new_user)
    db.commit()
    db.refresh(new_user)


    return new_user

# Update User
@router.put(
    "/{user_id}",
    response_model=UserResponse
)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()


    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    update_data = user_data.model_dump(
        exclude_unset=True
    )

    # If email is being changed, make sure it's not already taken
    if "email" in update_data and update_data["email"] != user.email:
        existing_user = db.query(User).filter(
            User.email == update_data["email"],
            User.id != user_id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

    # If password is updated
    if "password" in update_data:
        update_data["password_hash"] = hash_password(
            update_data.pop("password")
        )


    # Update fields
    for key, value in update_data.items():
        setattr(user, key, value)


    db.commit()
    db.refresh(user)


    return user

# Soft Delete User
@router.delete(
    "/{user_id}"
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):

    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()


    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    user.is_deleted = True

    db.commit()


    return {
        "message": "User deleted successfully"
    }