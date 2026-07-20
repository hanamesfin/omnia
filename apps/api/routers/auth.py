"""Auth router — register, login, me."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from auth import verify_password, hash_password, create_access_token, get_current_user
from database import get_db
from models import User, Organization

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str
    password: str
    org_name: str = "My Organization"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    org_id: str


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check unique email
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, {"error": {"code": "auth.email_taken", "message": "Email already registered", "retryable": False}})

    org = Organization(name=req.org_name)
    db.add(org)
    await db.flush()

    user = User(
        email=req.email,
        display_name=req.display_name,
        hashed_password=hash_password(req.password),
        role="admin",  # first user in org is admin
        org_id=org.id,
    )
    db.add(user)
    await db.flush()
    return UserResponse(id=user.id, email=user.email, display_name=user.display_name, role=user.role, org_id=user.org_id)


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, {"error": {"code": "auth.bad_credentials", "message": "Invalid email or password", "retryable": False}})
    token = create_access_token(user.id, user.org_id, user.role)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, email=current_user.email, display_name=current_user.display_name, role=current_user.role, org_id=current_user.org_id)
