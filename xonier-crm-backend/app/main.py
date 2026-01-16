from fastapi import FastAPI, HTTPException
from app.core.exception_handler import http_exception_handler, app_exception_handler
from app.utils.custom_exception import AppException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from app.db.db import connect_db
from app.utils.custom_response import ApiResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter
from app.core.config import get_setting
from app.middlewares.auth_middleware import AuthMiddleware

# Routes

from app.routes.user_role_route import router as user_role_router
from app.routes.auth_routes import router as auth_router
from app.routes.permission_route import router as permission_router
from app.routes.enquiry_route import router as enquiry_route
from app.routes.team_route import router as team_router
from app.routes.team_category_route import router as team_category_route

settings = get_setting()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield  

app = FastAPI(lifespan=lifespan)



origins = [
   settings.CLIENT_URL,
#    settings.CLIENT_URL_ALT
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"] 
)



app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content= ApiResponse(
           success=False,
           status_code=429,
           message="Rate limit exceeded"
        ).model_dump()
    )


app.add_middleware(SlowAPIMiddleware)

app.add_middleware(AuthMiddleware)


app.include_router(user_role_router, prefix="/api/user-role")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(permission_router, prefix="/api/permission")
app.include_router(enquiry_route, prefix="/api/enquiry")
app.include_router(team_router, prefix="/api/team")
app.include_router(team_category_route, prefix="/api/team-category")

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(AppException, app_exception_handler)

@app.get("/")
def welcome():
    return {"message": "Mridul Singh Saklani, naam to suna hi hoga!"}
