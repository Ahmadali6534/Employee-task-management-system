from dotenv import load_dotenv  # type: ignore
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = os.getenv("ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Cookies should only be marked Secure (HTTPS-only) once the app is actually
# served over HTTPS. Locked to the environment flag rather than a separate
# knob so it can't be forgotten when promoting to production.
COOKIE_SECURE = ENVIRONMENT == "production"

# Known placeholder values that must never reach a running app. If a secret
# this weak leaks or is left in a template, anyone can forge valid JWTs for
# any user (including admins) — so we fail hard at startup instead of
# silently running with an insecure key.
_PLACEHOLDER_SECRETS = {
    "",
    "ReplaceWithALongRandomSecretKey",
    "secret",
    "changeme",
    "change-me",
    "your-secret-key",
    "test-secret-key-not-for-production",
}

if not SECRET_KEY or SECRET_KEY in _PLACEHOLDER_SECRETS:
    raise RuntimeError(
        "SECRET_KEY is missing or is still set to a placeholder value. "
        "Generate a real one before starting the app, e.g.:\n"
        '    python -c "import secrets; print(secrets.token_urlsafe(64))"\n'
        "and set it in backend/.env (never commit that file)."
    )

if len(SECRET_KEY) < 32:
    raise RuntimeError(
        "SECRET_KEY is too short to be a safe HS256 signing key "
        "(need at least 32 characters, ideally 64+)."
    )

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set.")