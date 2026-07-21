from fastapi import FastAPI, Request  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from starlette.middleware.base import BaseHTTPMiddleware  # type: ignore
from app.routers.auth import router as auth_router
from app.routers.employees import router as employees_router
from app.routers.tasks import router as tasks_router
from app.routers.dashboard import router as dashboard_router
from app.routers.users import router as users_router
from app.routers.files import router as files_router
from app.routers.files import files_router as file_actions_router
from app.middleware.logging import LoggingMiddleware
from app.middleware.exceptions import global_exception_handler


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Defense-in-depth response headers. None of these are a substitute for
    fixing actual bugs, but they backstop classes of attack (clickjacking,
    MIME sniffing, and -- if an XSS sink is ever introduced -- script
    injection) that are otherwise one future mistake away.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # This is an API, not a page that renders third-party HTML, so a
        # tight default-src is safe and closes off script injection even
        # if an XSS sink is added to a route later.
        # EXCEPTION: FastAPI's built-in /docs and /redoc routes are actual
        # HTML pages that load Swagger UI / ReDoc's JS and CSS from a CDN.
        # A blanket default-src 'none' breaks them (blank page, CSP errors
        # in console). These are dev-tooling routes, not attacker-facing
        # production surface, so skip the strict CSP for them only.
        if request.url.path not in ("/docs", "/redoc", "/openapi.json"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none'"
            )
        return response


app = FastAPI()
app.add_exception_handler(
    Exception,
    global_exception_handler
)
app.add_middleware(
    LoggingMiddleware
)
app.add_middleware(SecurityHeadersMiddleware)

# SECURITY NOTE: these origins are hardcoded to local dev on purpose.
# allow_credentials=True means cookies are sent cross-origin for any origin
# listed here -- do NOT widen this to "*" (FastAPI/Starlette will reject
# that combination anyway) or to a production domain "temporarily" without
# also re-checking that every listed origin is one you actually trust.
# Add your deployed frontend's exact origin here when you deploy; don't
# widen beyond that.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(tasks_router)
app.include_router(dashboard_router)
app.include_router(users_router)
app.include_router(files_router)
app.include_router(file_actions_router)

@app.get("/")
def home():
    return {
        "message": "Employee Task Management API"
    }