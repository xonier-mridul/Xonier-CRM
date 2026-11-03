"""Retry transactions aborted by MongoDB write conflicts; never retry commits with unknown outcomes."""
import asyncio
from functools import wraps
from app.utils.custom_exception import AppException


def retry_transaction(function):
    @wraps(function)
    async def run(*args, **kwargs):
        for attempt in range(5):
            try:
                return await function(*args, **kwargs)
            except Exception as error:
                cause = error
                transient = False
                seen = set()
                while cause is not None and id(cause) not in seen:
                    seen.add(id(cause))
                    if callable(getattr(cause, "has_error_label", None)):
                        transient |= cause.has_error_label("TransientTransactionError")
                    cause = cause.__cause__ or cause.__context__
                if not transient:
                    raise
                if attempt == 4:
                    raise AppException(409, "Another request updated these leads or statuses. Please retry.") from error
                await asyncio.sleep(0.02 * (2 ** attempt))
    return run
