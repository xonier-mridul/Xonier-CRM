import time
from typing import Any, Dict, Set

from fastapi import WebSocket
from app.services.auth_sessions import SessionService


class ConnectionManager:
    """
    Keeps track of connected mobile apps (one user can have several sockets).

    In-memory, so it only knows about sockets of THIS server process. Call requests are
    always persisted in the DB too, so the mobile app's polling fallback keeps working
    if it is connected to a different worker.
    """

    POLL_ONLINE_WINDOW_SEC = 15

    def __init__(self):
        self._sockets: Dict[str, Set[WebSocket]] = {}
        self._last_seen: Dict[str, float] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._sockets.setdefault(user_id, set()).add(ws)
        self.touch(user_id)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        sockets = self._sockets.get(user_id)
        if sockets:
            sockets.discard(ws)
            if not sockets:
                self._sockets.pop(user_id, None)

    def touch(self, user_id: str) -> None:
        """Mark the user's mobile app as alive (socket activity or a poll request)."""
        self._last_seen[user_id] = time.time()

    def is_online(self, user_id: str) -> bool:
        if self._sockets.get(user_id):
            return True
        return (time.time() - self._last_seen.get(user_id, 0)) < self.POLL_ONLINE_WINDOW_SEC

    async def send(self, user_id: str, message: Dict[str, Any]) -> bool:
        """Push a message to every socket of the user. Returns True if at least one accepted it."""
        delivered = False
        for ws in list(self._sockets.get(user_id, ())):
            try:
                await SessionService().require(ws.scope.get("auth_payload"))
                await ws.send_json(message)
                delivered = True
            except Exception:
                self.disconnect(user_id, ws)
        return delivered


manager = ConnectionManager()
