"""
Auth utilities — JWT creation/validation, password hashing, RBAC.
§7.3, §5.10

Note: database/models are imported lazily so standalone mode can reuse
hashing + JWT without requiring Postgres drivers.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ─── Role-Permission Matrix (§5.10) ──────────────────────────────────────────
ROLE_MATRIX: dict[str, set[str]] = {
    "admin": {
        "agent.create", "agent.read", "agent.update", "agent.delete",
        "workflow.create", "workflow.read", "workflow.run", "workflow.delete",
        "marketplace.publish", "marketplace.read", "marketplace.review",
        "evaluation.read", "evolution.read",
        "email.send",
        "user.manage", "org.manage",
    },
    "editor": {
        "agent.create", "agent.read", "agent.update",
        "workflow.create", "workflow.read", "workflow.run",
        "marketplace.publish", "marketplace.read", "marketplace.review",
        "evaluation.read", "evolution.read", "email.send",
    },
    "viewer": {
        "agent.read",
        "workflow.read",
        "marketplace.read",
        "evaluation.read",
    },
}


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(user_id: str, org_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "org": org_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    from sqlalchemy import select
    from database import get_db
    from models import User

    # get_db is async generator — open a short-lived session here
    from database import AsyncSessionLocal

    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "auth.invalid_token", "message": "Invalid or expired token", "retryable": False}},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise cred_exc
    except JWTError:
        raise cred_exc

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise cred_exc
        return user


def require_permission(permission: str):
    """FastAPI dependency factory — checks RBAC before the route runs."""
    async def _dep(current_user=Depends(get_current_user)):
        if permission not in ROLE_MATRIX.get(current_user.role, set()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "auth.forbidden", "message": f"Role '{current_user.role}' cannot '{permission}'", "retryable": False}},
            )
        return current_user
    return _dep
