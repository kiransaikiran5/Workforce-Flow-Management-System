from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

# ── Configuration ──────────────────────────────────────────
# In production, move these to environment variables!
SECRET_KEY = "secret123"          # Change to a strong random string
ALGORITHM = "HS256"

# Default lifetimes
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


# ── Token creation ────────────────────────────────────────

def create_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Generic token creator (used in some existing code).
    Does NOT embed a 'type' claim – use create_access_token / create_refresh_token for new code.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """
    Creates an ACCESS token (for API requests).
    Lifetime defaults to ACCESS_TOKEN_EXPIRE_MINUTES if not provided.
    """
    to_encode = data.copy()
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    Creates a REFRESH token with longer lifetime and type='refresh'.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Token decoding / validation ──────────────────────────

def decode_token(token: str) -> dict:
    """
    Decodes and validates any JWT token.
    Returns the payload if valid, otherwise None.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def verify_token_type(payload: dict, expected_type: str) -> bool:
    """
    Checks that the token has the expected type ('access' or 'refresh').
    """
    if payload is None:
        return False
    return payload.get("type") == expected_type