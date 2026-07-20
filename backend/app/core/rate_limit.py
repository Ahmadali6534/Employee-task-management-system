"""
Lightweight in-memory rate limiter for sensitive endpoints (e.g. login).

Not distributed — resets if the process restarts and does not share state
across multiple server instances. Good enough for a single-instance
deployment; swap for a Redis-backed limiter if you scale horizontally.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request  # type: ignore

# ip -> list of timestamps (seconds) of recent attempts
_attempts: dict[str, list[float]] = defaultdict(list)

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60


def rate_limit_login(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Drop timestamps outside the current window
    _attempts[ip] = [
        ts for ts in _attempts[ip] if now - ts < WINDOW_SECONDS
    ]

    if len(_attempts[ip]) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in a minute."
        )

    _attempts[ip].append(now)