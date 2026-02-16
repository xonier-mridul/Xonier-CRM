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
from app.core.cache import init_cache

# Routes

from app.routes.user_role_route import router as user_role_router
from app.routes.auth_routes import router as auth_router
from app.routes.permission_route import router as permission_router
from app.routes.enquiry_route import router as enquiry_route
from app.routes.team_route import router as team_router
from app.routes.team_category_route import router as team_category_route
from app.routes.leads_route import router as lead_route
from app.routes.form_field_route import router as form_field_route
from app.routes.user_form_route import router as user_form_route
from app.routes.deal_route import router as deal_router
from app.routes.event_route import router as event_router
from app.routes.quotation_route import router as quote_router
from app.routes.quotation_history_route import router as quote_history_router
from app.routes.invoice_routes import router as invoice_router
from app.routes.notes_route import router as note_router
from app.routes.cusotm_form_field_route import router as custom_field_route

settings = get_setting()


@asynccontextmanager
async def lifespan(app: FastAPI):

    await connect_db()
    await init_cache()
    
    yield  

app = FastAPI(lifespan=lifespan)





origins = [
   settings.CLIENT_URL, "*", "http://192.168.1.22:3000"
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
app.include_router(lead_route, prefix="/api/lead")
app.include_router(form_field_route, prefix="/api/form")
app.include_router(user_form_route, prefix="/api/user-form")
app.include_router(deal_router, prefix="/api/deal")
app.include_router(event_router, prefix="/api/event")
app.include_router(quote_router, prefix="/api/quote")
app.include_router(quote_history_router, prefix="/api/quote-history")
app.include_router(invoice_router, prefix="/api/invoice")
app.include_router(note_router, prefix="/api/note")
app.include_router(custom_field_route, prefix="/api/custom-field")


app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(AppException, app_exception_handler)


@app.get("/")
def welcome():
    return {"message": "Mridul Singh Saklani, naam to suna hi hoga!"}
