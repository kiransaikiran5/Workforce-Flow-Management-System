from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user_model import User
from app.utils.jwt_handler import decode_token, verify_token_type

# Use OAuth2PasswordBearer so Swagger UI can automatically include the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts and validates the current user from the JWT access token.
    Verifies that the token is of type 'access' and that the user exists and is active.
    """
    payload = decode_token(token)
    if payload is None or not verify_token_type(payload, "access"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Token missing subject")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(role: str):
    """
    Dependency factory – restricts access to a single role.
    Usage: Depends(require_role("admin"))
    """
    def checker(user: User = Depends(get_current_user)):
        
        if user.role.lower() != role.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied – requires '{role}' role",
            )
        return user
    return checker


def require_roles(*allowed_roles: str):
    """
    Dependency factory – allows any of the specified roles.
    Usage: Depends(require_roles("admin", "hr"))
    """
    def checker(user: User = Depends(get_current_user)):
        user_role = user.role.lower()
        if user_role not in [r.lower() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied – allowed roles: {', '.join(allowed_roles)}",
            )
        return user
    return checker