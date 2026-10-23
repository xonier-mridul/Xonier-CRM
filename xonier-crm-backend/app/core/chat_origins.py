"""Explicit browser origins. Never accept arbitrary origins in production."""


def allowed_chat_origins(settings):
    origins = {settings.CLIENT_URL.rstrip("/"),
        *[origin.strip().rstrip("/") for origin in settings.CHAT_ALLOWED_ORIGINS.split(",") if origin.strip()]}
    if settings.ENV.strip().lower() in {"development", "dev", "local"}:
        origins.update(f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in (3000, 3100, 5173))
    return origins
