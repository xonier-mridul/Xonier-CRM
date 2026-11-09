import json
import unittest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import formparsers

from app.routes import gmail_route, mail_route
from app.routes.email_upload import MAX_ATTACHMENTS_BYTES, MAX_REQUEST_BYTES
from app.utils.custom_exception import AppException


class EmailUploadTests(unittest.IsolatedAsyncioTestCase):
    def client(self, route, authorize=False):
        app = FastAPI()
        app.state.limiter = route.limiter
        route.limiter.reset()
        app.include_router(route.router)

        @app.exception_handler(AppException)
        async def handle_error(request, exc):
            return JSONResponse({"message": exc.message}, status_code=exc.status_code)

        if authorize:
            async def allow(request: Request):
                request.state.user = {"_id": "test-user"}

            for dependency in route.send_access:
                app.dependency_overrides[dependency.dependency] = allow

        return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    async def test_both_routes_reject_unauthenticated_upload_without_reading_body(self):
        async def body():
            self.fail("The server read an unauthenticated upload")
            yield b""

        for route in (mail_route, gmail_route):
            async with self.client(route) as client:
                response = await client.post(route.router.prefix + "/send", content=body(), headers={
                    "Content-Type": "multipart/form-data; boundary=probe",
                })
                self.assertEqual(response.status_code, 401)

    async def test_chunked_overflow_closes_partially_written_attachment(self):
        temporary_files = []
        original = formparsers.SpooledTemporaryFile

        def capture_file(*args, **kwargs):
            file = original(*args, **kwargs)
            temporary_files.append(file)
            return file

        async def body():
            yield b'--probe\r\nContent-Disposition: form-data; name="files"; filename="probe.bin"\r\n\r\n'
            chunk = b"a" * (1024 * 1024)
            for _ in range(MAX_REQUEST_BYTES // len(chunk) + 1):
                yield chunk
            self.fail("The server continued reading beyond the upload limit")

        with patch.object(formparsers, "SpooledTemporaryFile", side_effect=capture_file):
            async with self.client(mail_route, authorize=True) as client:
                response = await client.post("/api/mail/send", content=body(), headers={
                    "Content-Type": "multipart/form-data; boundary=probe",
                })
        self.assertEqual(response.status_code, 413)
        self.assertEqual(len(temporary_files), 1)
        self.assertTrue(temporary_files[0].closed)

    async def test_authorized_multipart_preserves_attachment_and_size_limit(self):
        payload = json.dumps({"requestId": str(uuid4()), "to": ["agent@example.com"], "subject": "Hello", "body": "Test"})
        with patch.object(mail_route.service, "send", AsyncMock(return_value={"status": "sent"})) as send:
            async with self.client(mail_route, authorize=True) as client:
                response = await client.post("/api/mail/send", data={"payload": payload}, files={"files": ("test.txt", b"test")})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(send.await_args.args[2], [{"name": "test.txt", "content": b"test"}])
                response = await client.post("/api/mail/send", data={"payload": payload}, files={
                    "files": ("large.bin", b"a" * (MAX_ATTACHMENTS_BYTES + 1)),
                })
                self.assertEqual(response.status_code, 413)
                send.assert_awaited_once()
