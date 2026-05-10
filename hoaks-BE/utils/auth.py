# ============================================
# utils/auth.py — JWT & Password Helpers
# ============================================

import jwt
from datetime import datetime, timedelta, timezone
from config import Config
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(password: str) -> str:
    """Hash password menggunakan werkzeug (pbkdf2:sha256)."""
    return generate_password_hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verifikasi password terhadap hash."""
    # Support kedua format: werkzeug (pbkdf2:) dan bcrypt ($2b$)
    if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
        # Legacy bcrypt hash — gunakan bcrypt
        try:
            import bcrypt
            return bcrypt.checkpw(
                password.encode("utf-8"),
                hashed.encode("utf-8")
            )
        except Exception:
            return False
    else:
        # Werkzeug hash (default baru)
        return check_password_hash(hashed, password)


def create_token(user_id: int, username: str) -> str:
    """Buat JWT token dengan expiration."""
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(
            hours=Config.JWT_EXPIRATION_HOURS
        ),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    """
    Decode JWT token.
    Return payload dict jika valid, None jika invalid/expired.
    """
    try:
        payload = jwt.decode(
            token, Config.SECRET_KEY, algorithms=["HS256"]
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
