# Authentication and durable email delivery

## Implemented policy

Each user has **one browser session and one native-mobile session**, not two
arbitrary sessions. Multiple tabs sharing the same browser cookie are one session.
Normal `/api/auth/login` and Super Admin login always select the `web` slot.
Only the dedicated `/api/auth/mobile/*` flow selects `mobile`. The server binds
the OTP challenge to that flow, then signs `sessionType` and an unpredictable
`sid` into access/refresh JWTs. Payload fields, User-Agent and device headers
cannot change an issued token's slot.

Successful password + fresh email OTP verification replaces only the previous
session of the SAME type. Beginning a login or submitting a wrong OTP does not
log anyone out. The API denies a replaced session immediately; the web UI checks
every 15 seconds/on focus, and sockets revalidate every 5 seconds and before
receiving/sending events. In-flight requests already authorized before a switch
may finish. Refresh rotation preserves the slot and the absolute refresh expiry;
concurrent refreshes of the same token share a 10-second grace result.

After a takeover, that slot has a 5-minute takeover cooldown. The third takeover
within 30 minutes creates a 30-minute cooldown. Attempts during cooldown do not
extend it or evict the incumbent. Web/mobile cooldowns are independent. A valid
current session can reauthenticate itself. Logout ends only the caller's slot;
password change/reset, account disable/delete and company suspension revoke both.
Re-enabling an account does not revive old sessions. Password recovery clears
both switching locks after email proof. There is no automatic re-login loop.

Password-only sharing does not bypass OTP. If two people share BOTH the password
and the mailbox/OTP, this policy limits disruption but cannot identify the rightful
person. Use separate employee accounts and private MFA/mailboxes. OTP validity is
10 minutes, five failed guesses per login challenge; codes are single-use, client-
bound, HMAC-protected, and superseded on resend. The hardcoded admin/development
OTP bypass is removed. Company registration uses HMAC-protected new codes and
durable external attempt limits; already-issued legacy registration codes remain
valid only until their existing expiry. The administrator OTP history API no
longer reveals OTPs (including legacy ones).

### Mobile integration is required before enabling calling for users

The Android/iOS source was not available in this workspace. The backend contract
is implemented and HTTP-tested, but the native app must be updated and released
by its developer. See `MOBILE_AUTH_CONTRACT.md`. The old OTP request contract is
no longer accepted, and web endpoints no longer return bearer tokens in JSON.
An app ported only to the new OTP format but still using `/api/auth/login` selects
`web`, not `mobile`; it cannot be safely auto-detected.
Do not deploy this backend without coordinating the native release if web-to-phone
calling is currently in use. Keep the existing dialer API deployment at one API
worker because its connection manager remains process-local (see chat deployment).
The browser call-status panel now follows persisted state with its web cookie
(2-second polling with bounded error backoff), never by joining the native phone
socket. This avoids marking a browser as an online dialer or storing JWTs in URLs.

Browser verify/refresh responses return the profile, not bearer/refresh tokens;
those tokens remain in HttpOnly cookies. Native authentication never sets browser
cookies. Mobile tokens require Bearer
transport and are rejected in browser request contexts; the mobile call socket
requires a signed mobile token. This rejects normal browser use of the mobile
flow, but is NOT proof of physical hardware or genuine app installation. No
server can establish that from User-Agent/custom headers alone. For adversarial
clients, integrate Android Play Integrity / iOS App Attest with server-side nonce
verification; that needs the native project, app identities and platform setup.
Never embed a shared “mobile secret” in the APK/IPA as an attestation substitute.

## Queue design and semantics

All current application email producers now enqueue: login/admin OTP, password
recovery/security notices, registration/resend, quotations, CRM template sends,
bulk sends and history resends. Only `app/workers/mail_worker.py` contacts SMTP.
The business write and outbox insertion share a MongoDB transaction. Majority
writes are enabled for API and worker clients. No extra broker is needed for this
deployment; MongoDB replica-set/Atlas durability is the queue's source of truth.

Two separate worker lanes (`critical`, `general`) isolate OTP/security processing
from general/bulk work. Atomic claims, per-claim lease tokens, pre-dispatch fencing,
bounded exponential backoff with jitter, expiry checks and crash recovery prevent
ordinary competing workers from sending the same job simultaneously. Each job
has one envelope recipient: partial acceptance cannot duplicate other recipients.
BCC is never a MIME header. Subjects/bodies/recipient payloads in the outbox are
Fernet encrypted; accepted/expired/cancelled jobs purge the payload, and terminal
metadata expires after the retention setting. Existing CRM email history remains
business history, not an encrypted vault. Restrict database access and backups.

States: `queued -> sending -> sent | failed | uncertain | expired`. A known SMTP
4xx response is retried (up to six total attempts), 5xx is terminal. A claimed
worker crash before dispatch is safe to reclaim. If connection loss/crash happens
after dispatch may have begun, delivery is `uncertain` and is NOT auto-retried.
SMTP offers no exactly-once guarantee. `sent` means SMTP accepted the message,
NOT inbox delivery/read receipt; bounces require a provider webhook integration.
Expired/used/superseded OTPs are checked before dispatch and cannot be accepted
by authentication, even if an already-in-flight email arrives late.

CRM history is `queued` until every recipient is accepted; mixed terminal failure
is `failed`. Deleting queued history cancels its pending jobs transactionally.
In-flight/uncertain delivery blocks deletion until resolved. Already-sent mail
cannot be recalled. Quotation workflow statuses are business states, not proof of
SMTP delivery; consult the queue for actual delivery state.

Clients may send `Idempotency-Key` (nonblank, <=128 chars) to CRM send/bulk/resend
endpoints. Reuse the same key for retries of the same user action; a changed
payload returns 409. Do not generate a fresh key merely because a response timed
out. Without a key, a new request is intentionally a new send. Bulk work commits
per recipient and returns queued/failed counts; retry the same keyed request to
complete partial acceptance without re-enqueuing successful items. Backend queue
intents also have deterministic keys and reject changed payloads for a reused key.

## EC2 rollout (SSH/Termius is sufficient)

No production deployment or real email delivery was performed by this change.

1. Back up the database and release. Inspect `sudo systemctl cat myapp` to confirm
   the backend WorkingDirectory, virtualenv, user and environment. The service
   example below assumes `/var/www/Xonier-CRM/xonier-crm-backend`; your server may
   instead use `/var/www/Xonier-CRM` directly. **Use the actual backend directory.**
2. Confirm MongoDB is a replica set/Atlas/mongos with `db.adminCommand({hello:1})`:
   expect `setName` or `msg: "isdbgrid"`. API startup now fails on standalone
   MongoDB because authentication/outbox transactions must work. Do not convert a
   live database without a backup and a DBA migration plan. The DB role needs
   transactions, collections, indexes, and majority writes. Keep MongoDB private.
3. Install the existing `requirements.txt` into the actual service virtualenv.
   Append `AUTH_MAIL.env.example` settings to the existing backend `.env`; preserve
   all current credentials. API and BOTH workers must use the SAME database,
   Fernet key, SECRET_KEY, JWT keys and SMTP configuration. Never rotate encryption
   keys by overwriting them while queued mail/encrypted CRM data still needs them.
   Set `ENV=production`, the real HTTPS `CLIENT_URL`, and conservative provider
   quotas. Verify system time/NTP. Never print the `.env` in shared logs/chats.
4. Copy `deploy/trakeroo-mail@.service` to
   `/etc/systemd/system/trakeroo-mail@.service`. Edit its `User`, `Group`,
   `WorkingDirectory`, and `ExecStart` to match the actual backend. The settings
   loader reads `.env` from WorkingDirectory; it must be readable by that user,
   not world-readable. Use your existing secrets manager/environment injection
   if applicable. Keep the worker timeout/lease ratio >=3. Use separate processes
   from Uvicorn/Gunicorn, not background tasks inside API workers.
5. Start both workers BEFORE restarting the API. After editing the unit:

   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable --now trakeroo-mail@critical trakeroo-mail@general
   sudo systemctl status trakeroo-mail@critical trakeroo-mail@general --no-pager
   ```

6. Coordinate the native app release. Deploy backend and frontend together using
   the existing release procedure; build with the correct HTTPS
   `NEXT_PUBLIC_BASE_URL=https://app.trakeroo.com/api`, then restart the existing
   services. Normal production `npm run build` is unchanged. Local verification
   also supports `npx next build --webpack` if Turbopack is unavailable.
   **All pre-release JWTs lack the new signed session claims: everyone must sign
   in once again.** No migration of old refresh tokens is safe.
7. No new public port or Nginx location is needed for mail workers or mobile auth.
   Existing `/api` proxy serves them. Keep HTTPS, WebSocket upgrade headers and
   the current origin allowlist. Never expose MongoDB/Redis/SMTP credentials.
8. Smoke-test with controlled test accounts/mailboxes: web A + mobile A coexist;
   web B replaces only web A; mobile B replaces only mobile A; an immediate next
   takeover returns 429 with `Retry-After`; wrong OTP does not evict either;
   password recovery ends both. Confirm web-to-phone request/pending/status and
   socket reconnect after access expiry with the UPDATED native app.

## Monitoring and retries

Run from the backend directory using its configured environment:

```sh
PYTHONPATH=. venv/bin/python scripts/mail_queue_status.py
sudo journalctl -u trakeroo-mail@critical -u trakeroo-mail@general -n 100 --no-pager
```

The CLI prints redacted counts/worker health (no recipient/body/OTP): exit 2 means
a lane has no recent heartbeat, 1 means failed/review-required jobs or queued age
>120 seconds, 0 is healthy. Wire these conditions, worker restart loops and database
availability into your existing alerting/monitoring; the script alone does not
send alerts. Heartbeats expire after five minutes; health requires lastSeen<45s.

Super Admin authenticated endpoints (not Company Admin):

* `GET /api/operations/email-queue`
* `GET /api/operations/email-queue/jobs?state=failed` (or `uncertain`), latest 100
* `POST /api/operations/email-queue/jobs/{jobId}/retry` with `{}` for a known failed
  job; uncertain jobs require `{"acknowledgePossibleDuplicate":true}` AFTER
  checking SMTP provider logs. This action is audited. Expired/used OTPs cannot
  be redriven; request a fresh code. Do not blindly bulk-redrive uncertain mail.

Maintenance can safely stop workers: accepted jobs remain durable and API enqueue
continues, but OTPs expire if workers stay down. To roll back API code, first stop
new producers and both workers, investigate pending/uncertain jobs, and retain the
outbox collections. Never delete/recreate the queue to clear an incident. Rolling
back legacy authentication also restores the old insecure multi-login behavior;
plan another forced re-login and coordinate native clients.

## Verification commands

Use disposable LOCAL data only (the test fixtures refuse remote MongoDB URLs):

```sh
AUTH_MAIL_TEST_MONGO_URI='mongodb://127.0.0.1:27029/?replicaSet=chat-test' PYTHONPATH=.:tests venv/bin/python -m unittest discover -s tests -p 'test_auth_mail.py' -v
COMPANY_CODE_TEST_MONGO_URI='mongodb://127.0.0.1:27029/?replicaSet=chat-test' PYTHONPATH=.:tests venv/bin/python -m unittest discover -s tests -p 'test_company_codes.py' -q
CHAT_TEST_MONGO_URI='mongodb://127.0.0.1:27029/?replicaSet=chat-test' PYTHONPATH=.:tests venv/bin/python -m unittest discover -s tests -p 'test_chat.py' -q
```

SMTP is mocked/injected in auth/mail tests: no external email is sent. HTTP tests
exercise actual routes, middleware, cookies, refresh and cross-slot rejection.
Relevant design references: [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
[transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).
