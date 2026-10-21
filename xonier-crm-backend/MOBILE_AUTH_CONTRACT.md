# Native mobile companion login — handoff for Android/iOS developer

Backend base: `https://app.trakeroo.com/api`. The existing browser flow stays on
`/auth/login`; **the native app must switch to `/auth/mobile/*`**. The app source
was not available for this implementation; do not assume the old build is compatible.

Each account may have one browser and one native app login at the same time.
The second native app login replaces only the old native login; a browser login
does not affect the phone. The server enforces signed slots, not User-Agent values
or a client-provided `sessionType`. Normal HTTP browser contexts are rejected by
the native flow. Genuine-install/hardware proof would additionally require Play
Integrity/App Attest integration; this API does not claim hardware attestation.

## Request/response sequence

Use HTTPS JSON requests. Generate a random installation UUID once, keep it in
Keychain/Android secure storage, and send it as `X-Client-ID` consistently during
login, resend, verification, refresh and logout. It is a challenge-binding hint,
NOT a password or a slot-bypass secret. Do not spoof browser `Origin`/`Sec-Fetch-*`
headers; native HTTP libraries do not need them.

1. `POST /auth/mobile/login`

   ```json
   {"email":"employee@example.com","password":"USER_PASSWORD","companyId":"XON-1234"}
   ```

   Success envelope contains `data.challengeId`, `data.expiresIn` (600),
   `data.resendAfter` (60), `data.mailStatus` (`queued`). This has NOT yet logged
   anyone out. Preserve the challenge ID and installation ID, not the password.

2. `POST /auth/mobile/verify-login-otp`

   ```json
   {"challengeId":"OPAQUE_CHALLENGE_FROM_STEP_1","otp":123456}
   ```

   On success, `data` contains the user profile, `sessionType:"mobile"`,
   `accessToken`, `refreshToken`. No web cookies are set. Save tokens in secure
   OS storage (not ordinary preferences/logs/URLs), clear the password/code, then
   attach `Authorization: Bearer ACCESS_TOKEN` on authenticated requests.
   Access token life defaults to 15 minutes; refresh/session expiry is absolute
   and follows the configured `REFRESH_TOKEN_EXPIRY` days.

3. Optional resend: `POST /auth/mobile/resend-login-otp` with
   `{"challengeId":"..."}` after `resendAfter`. The challenge ID stays the same,
   but only the latest code is valid. Used/expired challenges require step 1.

4. Refresh: `POST /auth/mobile/refresh` with `{"refreshToken":"CURRENT_REFRESH"}`.
   Save BOTH new tokens atomically and replace the old pair. Serialize refreshes
   in the app; never start several independent refresh loops. Use this endpoint,
   NOT `/auth/refresh`. The web endpoint rejects native refresh tokens and vice
   versa. A short grace protects concurrent identical refreshes; do not treat it
   as permission to retain/replay old tokens.

5. `GET /auth/session` with Bearer token checks current session. Use it on app
   foreground/resume. `POST /auth/mobile/logout` ends only this native session;
   the browser remains signed in. Clear the local tokens and close sockets.

On 401, use `error.code`: `SESSION_REPLACED`, `SESSION_EXPIRED`, `ACCOUNT_DISABLED`
mean clear tokens, stop polling/sockets/auto-relogin, show login with explanation.
An ordinary access-expiry 401 may attempt one serialized refresh, then retry the
original request once. Do not refresh endlessly. Network/503 failures are temporary
and must NOT cause credential re-login. `CLIENT_TYPE_MISMATCH` is integration error.
`OTP_INVALID` requires latest OTP/start-over, not token refresh.

`429 TAKEOVER_LIMITED` / `RATE_LIMITED` includes `Retry-After` seconds. Show the
wait and leave the incumbent session alone. Default same-type takeover cooldown
is 5 minutes, rising to 30 minutes after three switches in 30 minutes. Do not
automatically retry login in the background. Password recovery uses the existing
company-scoped `/auth/forgot-password` + `/auth/verify-forgot-pass-otp` challenge
contract (include the same X-Client-ID); successful recovery logs out BOTH types.

## Calling and socket lifecycle

All `/mobile/*` HTTP endpoints now require a native token. The browser uses
`/call/request` with its web cookie; the native app receives/polls the user's call
request using its separate mobile session.
The browser follows persisted call status with cookie-authenticated polling; it
must not connect to the native mobile socket or impersonate phone presence.
For the native WebSocket use:

```text
wss://app.trakeroo.com/api/mobile/ws
Authorization: Bearer CURRENT_MOBILE_ACCESS_TOKEN
```

Prefer the Authorization header supported by native socket libraries. The old
`?token=` parameter remains accepted for transition, but URLs can leak into proxy
logs, so do not use it in a new build. Server closes with 4401 on invalid/replaced/
expired auth. Refresh once where appropriate, then reconnect with the new access
token and bounded exponential backoff. A replaced login must not reconnect using
stored credentials. Server replays the persisted pending call on reconnect; keep
existing session-ID idempotence when handling call_request/call_status events.

Required release tests: web A + phone A both work; browser B only replaces browser
A; phone B only replaces phone A; old phone access/refresh/socket are rejected;
phone logout leaves browser active; recovery/disable ends both; access expiry
refresh+reconnect works; timeout/offline does not create login ping-pong. Test the
real dialer permissions/background lifecycle on actual Android/iOS devices.
