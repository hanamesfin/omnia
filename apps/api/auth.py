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

# Seed/catalog identities may exist for marketplace ownership, but must NEVER
# become a signed-in session (no demo-login, no token for these accounts).
SEED_SESSION_BLOCKED_IDS: frozenset[str] = frozenset({
    "user-demo-admin",
    "user-demo-viewer",
})
SEED_SESSION_BLOCKED_EMAILS: frozenset[str] = frozenset({
    "admin@demo.com",
    "viewer@demo.com",
})


def is_blocked_session_identity(
    *,
    email: str | None = None,
    user_id: str | None = None,
) -> bool:
    """True for catalog-seed users that must not authenticate as a live profile."""
    if user_id and str(user_id) in SEED_SESSION_BLOCKED_IDS:
        return True
    if email and str(email).strip().lower() in SEED_SESSION_BLOCKED_EMAILS:
        return True
    return False


def raise_if_blocked_session(
    *,
    email: str | None = None,
    user_id: str | None = None,
) -> None:
    if is_blocked_session_identity(email=email, user_id=user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "auth.demo_disallowed",
                    "message": "Demo accounts cannot sign in — use a real account",
                    "retryable": False,
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )


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


def create_access_token(
    user_id: str,
    org_id: str,
    role: str,
    email: str | None = None,
    display_name: str | None = None,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "org": org_id,
        "role": role,
        "exp": expire,
    }
    # Self-contained claims: on serverless the user row may live on a different
    # instance, so the token carries enough identity to rebuild the session
    # without a shared DB — and without ever falling back to a demo account.
    if email:
        payload["email"] = email
    if display_name:
        payload["name"] = display_name
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
        raise_if_blocked_session(user_id=user_id, email=payload.get("email"))
    except JWTError:
        raise cred_exc

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise cred_exc
        raise_if_blocked_session(user_id=user.id, email=user.email)
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
