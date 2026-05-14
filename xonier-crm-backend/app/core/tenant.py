
from contextvars import ContextVar
from contextlib import contextmanager
from typing import Optional

current_company: ContextVar[Optional[str]] = ContextVar("current_company", default=None)
is_admin_context: ContextVar[bool] = ContextVar("is_admin_context", default=False)
bypass_scope: ContextVar[bool] = ContextVar("bypass_scope", default=False)


@contextmanager
def system_query():
    
    token = bypass_scope.set(True)
  
    try:
        yield
    finally:
        bypass_scope.reset(token)