from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

LearningStyle = Literal["visual", "auditory", "reading", "kinesthetic"]
ExpertiseLevel = Literal["beginner", "intermediate", "advanced"]
AgeGroup = Literal["primary", "secondary", "adult"]
Goal = Literal["curiosity", "exam_prep", "homework", "career"]
ImageStyle = Literal[
    "cartoon", "watercolor", "photorealistic", "minimalist", "anime", "scientific", "3d_render"
]


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    name: str = Field(..., min_length=1, max_length=255, description="User's display name")
    interests: list[str] = Field(
        default_factory=list, description="List of topic interests for personalization"
    )
    learning_style: LearningStyle = Field(default="visual", description="Preferred learning style")
    expertise_level: ExpertiseLevel = Field(
        default="beginner", description="Current expertise level"
    )
    perspective: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional description of user's viewpoint or role",
    )
    age_group: AgeGroup | None = Field(default=None, description="Age group for personalization")
    goal: Goal | None = Field(default=None, description="Learning goal")
    image_style: ImageStyle | None = Field(
        default="cartoon", description="Default image style preference"
    )


class UserUpdate(BaseModel):
    """Schema for updating an existing user. All fields optional."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    interests: list[str] | None = None
    learning_style: LearningStyle | None = None
    expertise_level: ExpertiseLevel | None = None
    perspective: str | None = Field(default=None, max_length=1000)
    age_group: AgeGroup | None = None
    goal: Goal | None = None
    image_style: ImageStyle | None = None


class UserLoginRequest(BaseModel):
    """Schema for name-based login."""

    name: str


class UserResponse(BaseModel):
    """Schema for user API responses."""

    id: int
    name: str
    interests: list[str]
    learning_style: str
    expertise_level: str
    perspective: str | None
    age_group: str | None
    goal: str | None
    image_style: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
