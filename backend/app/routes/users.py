from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLoginRequest, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> UserResponse:
    """Create a new user profile.

    Args:
        payload: User creation data.
        db: Async database session.

    Returns:
        Created user as UserResponse.
    """
    user = User(
        name=payload.name,
        interests=payload.interests,
        learning_style=payload.learning_style,
        expertise_level=payload.expertise_level,
        perspective=payload.perspective,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
async def login_user(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)) -> UserResponse:
    """Look up a user by name (case-insensitive).

    Args:
        payload: Login request containing the user's name.
        db: Async database session.

    Returns:
        Matching user as UserResponse.

    Raises:
        HTTPException 404: If no user exists with that name.
    """
    result = await db.execute(select(User).where(func.lower(User.name) == payload.name.lower()))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No user found with that name"
        )
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)) -> UserResponse:
    """Retrieve a user by ID.

    Args:
        user_id: Primary key of the user.
        db: Async database session.

    Returns:
        User as UserResponse.

    Raises:
        HTTPException 404: If the user does not exist.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update an existing user's profile fields.

    Only fields provided in the payload are updated (partial update).

    Args:
        user_id: Primary key of the user to update.
        payload: Fields to update; omitted fields are left unchanged.
        db: Async database session.

    Returns:
        Updated user as UserResponse.

    Raises:
        HTTPException 404: If the user does not exist.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)
