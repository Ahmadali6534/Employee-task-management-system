"""
Lightweight in-memory rate limiter for sensitive endpoints (e.g. login).

Not distributed -- resets if the process restarts and does not share state
across multiple server instances. Good enough for a single-instance
deployment; swap for a Redis-backed limiter if you scale horizontally.

Keyed on BOTH the client IP and the submitted email/username. IP-only
limiting is trivial to route around (rotate IPs, use a botnet) while still
hammering one account; email-only limiting lets an attacker lock a victim
out by deliberately failing their login from anywhere. Keying on both closes
the gap either alone leaves open: an attacker spreading requests across IPs
still gets capped on the target account, and one IP can't be used to lock
out arbitrary victims without also burning its own IP-level budget.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request  # type: ignore

# key -> list of timestamps (seconds) of recent attempts
_attempts: dict[str, list[float]] = defaultdict(list)

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60


def _check(key: str, now: float) -> None:
    _attempts[key] = [
        ts for ts in _attempts[key] if now - ts < WINDOW_SECONDS
    ]

    if len(_attempts[key]) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in a minute."
        )


def _record(key: str, now: float) -> None:
    _attempts[key].append(now)


async def rate_limit_login(request: Request):
    ip = request.client.host if request.client else "unknown"

    # The login route consumes an OAuth2PasswordRequestForm, so the body is
    # form-encoded. Peek at it here without disturbing the endpoint's own
    # Depends(OAuth2PasswordRequestForm) -- Starlette caches the parsed body
    # on the request, so reading it twice is safe and cheap.
    email = "unknown"
    try:
        form = await request.form()
        email = (form.get("username") or "unknown").strip().lower()
    except Exception:
        pass

    ip_key = f"ip:{ip}"
    email_key = f"email:{email}"
    now = time.time()

    _check(ip_key, now)
    _check(email_key, now)

    _record(ip_key, now)
    _record(email_key, now)