from fastapi import Request # type: ignore
from fastapi.responses import JSONResponse # type: ignore


async def global_exception_handler(
    request: Request,
    exc: Exception
):

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal Server Error"
        }
    )