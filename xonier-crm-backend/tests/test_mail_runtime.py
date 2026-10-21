"""Local startup defaults must not silently disable OTP delivery or embed SMTP in production."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from chat_test_env import seed_test_settings
seed_test_settings()
from app.core.mail_runtime import embedded_enabled
from app.core.config import EnvSettings, get_setting
from app.core.mail_delivery import mailpit_enabled, smtp_options
from app.workers.mail_worker import rejection_category, smtp_send


class MailRuntimeTests(unittest.TestCase):
    def test_dev_auto_capture_ignores_real_smtp_host_and_credentials(self):
        settings = get_setting().model_copy(update={"ENV": "development", "MAIL_DELIVERY_MODE": "auto",
            "EMAIL_HOST": "never-contact.example.test", "EMAIL_PORT": "465"})
        self.assertTrue(mailpit_enabled(settings))
        options = smtp_options(settings)
        self.assertEqual(options["hostname"], "127.0.0.1")
        self.assertEqual(options["port"], 1025)
        self.assertFalse(options["use_tls"])
        self.assertFalse(options["start_tls"])

    def test_production_auto_and_explicit_smtp_require_tls(self):
        for environment, mode in [("production", "auto"), ("staging", "auto"), ("development", "smtp")]:
            for port in (465, 587):
                settings = get_setting().model_copy(update={"ENV": environment, "MAIL_DELIVERY_MODE": mode,
                    "EMAIL_PORT": str(port), "MAIL_SMTP_TLS": "auto"})
                self.assertFalse(mailpit_enabled(settings))
                options = smtp_options(settings)
                self.assertEqual(options["use_tls"], port == 465)
                self.assertEqual(options["start_tls"], port != 465)
                self.assertTrue(options["validate_certs"])

    def test_mailpit_cannot_be_selected_outside_development(self):
        for environment in ("production", "staging", "test"):
            values = {**get_setting().model_dump(), "ENV": environment, "MAIL_DELIVERY_MODE": "mailpit"}
            with self.assertRaises(ValueError):
                EnvSettings.model_validate(values)
            with self.assertRaises(ValueError):
                smtp_options(SimpleNamespace(**values))

    def test_local_api_starts_queue_consumers_by_default(self):
        for environment in ("development", "dev", "local", "Development"):
            self.assertTrue(embedded_enabled(SimpleNamespace(ENV=environment, MAIL_WORKER_MODE="auto")))

    def test_production_staging_and_tests_use_external_consumers(self):
        for environment in ("production", "staging", "test"):
            self.assertFalse(embedded_enabled(SimpleNamespace(ENV=environment, MAIL_WORKER_MODE="auto")))

    def test_explicit_external_mode_never_embeds_consumers(self):
        self.assertFalse(embedded_enabled(SimpleNamespace(ENV="development", MAIL_WORKER_MODE="external")))

    def test_embedded_production_mode_is_rejected(self):
        with self.assertRaises(ValueError):
            embedded_enabled(SimpleNamespace(ENV="production", MAIL_WORKER_MODE="embedded"))

    def test_smtp_diagnostics_never_include_response_addresses(self):
        for response, label in [
            ("550 Sender private@example.test rejected", "sender_rejected"),
            ("550 Recipient private@example.test unknown", "recipient_rejected"),
            ("Relay access denied for private@example.test", "relay_denied"),
            ("Daily quota exceeded for private@example.test", "provider_quota"),
            ("Email blocked by policy private@example.test", "provider_policy_rejected"),
        ]:
            self.assertEqual(rejection_category(response), label)


class MailTransportTests(unittest.IsolatedAsyncioTestCase):
    async def test_dev_transport_never_authenticates_with_provider_credentials(self):
        settings = get_setting().model_copy(update={"ENV": "development", "MAIL_DELIVERY_MODE": "auto"})
        smtp = MagicMock(connect=AsyncMock(), login=AsyncMock(), send_message=AsyncMock())
        payload = {"subject": "Synthetic", "fromName": "Test", "fromEmail": "test@example.test",
            "to": ["demo@example.test"], "cc": [], "recipient": "demo@example.test", "text": "Test", "html": "<p>Test</p>"}
        mark = AsyncMock()
        with patch("app.workers.mail_worker.get_setting", return_value=settings), \
                patch("app.workers.mail_worker.aiosmtplib.SMTP", return_value=smtp) as factory:
            await smtp_send(payload, "synthetic", mark)
        self.assertEqual(factory.call_args.kwargs["hostname"], "127.0.0.1")
        smtp.login.assert_not_awaited()
        smtp.send_message.assert_awaited_once()
        mark.assert_awaited_once()

    async def test_local_inbox_unavailable_does_not_fall_back_to_provider(self):
        settings = get_setting().model_copy(update={"ENV": "development", "MAIL_DELIVERY_MODE": "auto"})
        smtp = MagicMock(connect=AsyncMock(side_effect=ConnectionRefusedError()), login=AsyncMock())
        mark = AsyncMock()
        with patch("app.workers.mail_worker.get_setting", return_value=settings), \
                patch("app.workers.mail_worker.aiosmtplib.SMTP", return_value=smtp) as factory:
            with self.assertRaises(ConnectionRefusedError):
                await smtp_send({}, "synthetic", mark)
        self.assertEqual(factory.call_count, 1)
        self.assertEqual(factory.call_args.kwargs["hostname"], "127.0.0.1")
        smtp.login.assert_not_awaited()
        mark.assert_not_awaited()
