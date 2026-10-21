"""Explicit development mail capture; never fall back to an external provider."""


def mailpit_enabled(settings):
    development = settings.ENV.strip().lower() in {"development", "dev", "local"}
    if settings.MAIL_DELIVERY_MODE == "mailpit" and not development:
        raise ValueError("Mailpit delivery is development-only")
    return settings.MAIL_DELIVERY_MODE == "mailpit" or settings.MAIL_DELIVERY_MODE == "auto" and development


def smtp_options(settings):
    common = {"timeout": settings.MAIL_SMTP_TIMEOUT_SECONDS, "validate_certs": True}
    if mailpit_enabled(settings):
        # Fixed numeric loopback: a typo/DNS change cannot leak dev mail or SMTP
        # credentials to an external server. No authentication is used here.
        return {**common, "hostname": "127.0.0.1", "port": settings.MAIL_DEV_SMTP_PORT,
            "use_tls": False, "start_tls": False}
    port = int(settings.EMAIL_PORT)
    mode = settings.MAIL_SMTP_TLS
    if mode not in {"auto", "tls", "starttls"}:
        raise ValueError("MAIL_SMTP_TLS must be auto, tls or starttls")
    implicit = mode == "tls" or mode == "auto" and port == 465
    return {**common, "hostname": settings.EMAIL_HOST, "port": port,
        "use_tls": implicit, "start_tls": not implicit}
