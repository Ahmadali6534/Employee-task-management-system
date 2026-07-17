import time

from starlette.middleware.base import BaseHTTPMiddleware # type: ignore
from fastapi import Request # type: ignore


class LoggingMiddleware(BaseHTTPMiddleware):

    async def dispatch(
        self,
        request: Request,
        call_next
    ):

        start_time = time.time()


        response = await call_next(request)


        process_time = time.time() - start_time


        print(
            f"{request.method} "
            f"{request.url.path} "
            f"{response.status_code} "
            f"{process_time:.4f}s"
        )


        return response