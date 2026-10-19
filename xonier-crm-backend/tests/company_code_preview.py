"""Local-only UI fixture using the actual company service and disposable test DB.

COMPANY_CODE_PREVIEW=1 COMPANY_CODE_TEST_MONGO_URI=mongodb://127.0.0.1:27029/?replicaSet=chat-test \
PYTHONPATH=.:tests venv/bin/python tests/company_code_preview.py

Never run on a public interface or with a real application database. All users,
cookies and records are synthetic. Stops cleanly and drops its random test DB.
"""
import os
from contextlib import asynccontextmanager

if os.getenv("COMPANY_CODE_PREVIEW") != "1":
    raise RuntimeError("This synthetic preview requires COMPANY_CODE_PREVIEW=1")

from test_company_codes import CompanyCodeMongoTests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
import uvicorn
from app.schemas.company_schema import CompanyUpdateSchema
from app.utils.custom_exception import AppException
from app.core.tenant import system_query


@asynccontextmanager
async def lifespan(app):
    fixture = CompanyCodeMongoTests()
    await fixture.asyncSetUp()
    app.state.fixture = fixture
    print(f"Synthetic Company Admin UI: http://localhost:3100/companySetting/{fixture.company_id}")
    print("Synthetic Super Admin UI: http://localhost:8000/__preview/super-admin")
    try:
        yield
    finally:
        await fixture.asyncTearDown()


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3100"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def actor(request):
    fixture = request.app.state.fixture
    return fixture.admin if request.cookies.get("company_preview_role") == "super" else fixture.company_admin


@app.exception_handler(AppException)
async def app_error(request, error):
    return JSONResponse({"message": error.message}, status_code=error.status_code)


@app.get("/__preview/{role}")
async def preview(role: str):
    fixture = app.state.fixture
    admin = role == "super-admin"
    response = RedirectResponse(f"http://localhost:3100/{'companies/update' if admin else 'companySetting'}/{fixture.company_id}")
    response.set_cookie("company_preview_role", "super" if admin else "company")
    response.set_cookie("accessToken", "synthetic-preview-only-not-a-real-token", httponly=True)
    return response


@app.get("/api/auth/me")
async def me(request: Request):
    fixture = app.state.fixture
    with system_query():
        company = await fixture.service.get_by_id(str(fixture.company_id), fixture.admin)
    return {"data": {"id": str(fixture.admin_id), "firstName": "Preview", "lastName": "Admin",
        "email": "preview@example.com", "phone": "1234567890", "status": "active", "isEmailVerified": True,
        "isActive": True, "companyId": company,
        "userRole": [{"id": str(fixture.admin_id), "name": "Preview Admin", "code": actor(request)["userRole"][0]["code"], "permissions": []}]}}


@app.get("/api/companies/{company_id}")
async def company(company_id: str, request: Request):
    with system_query():
        return {"data": await app.state.fixture.service.get_by_id(company_id, actor(request))}


@app.patch("/api/companies/{company_id}")
async def update(company_id: str, payload: CompanyUpdateSchema, request: Request):
    with system_query():
        return {"data": await app.state.fixture.service.update(company_id, payload, actor(request))}


@app.get("/api/companies/{company_id}/code-suggestion")
async def suggest(company_id: str, request: Request):
    return {"data": await app.state.fixture.service.suggest_code(company_id, actor(request))}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
