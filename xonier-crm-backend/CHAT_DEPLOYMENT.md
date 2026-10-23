# Trakeroo Communication

The dashboard page is `/communication`. It includes direct messages, group DMs,
company public/private channels, threads, reactions, author-only edit/delete,
history/search, unread counts, typing, presence, private file attachments, and
conversation-scoped voice/video calls with screen sharing. Incoming calls work
across dashboard pages while the browser is open. This is an initial collaboration
module, not full Slack parity: mobile push, PSTN calls, recording, scheduled
meetings, retention/admin export, DND, and cross-company guests are not included.

## Communication UI and permissions

Member search/invites, owner transfer, name/purpose edits and archive/restore use
in-app dialogs. Destructive confirmations reuse the existing `ConfirmPopup`.
Only the conversation owner can manage a group/channel; membership is enforced
by the backend, not just hidden buttons. An owner must transfer ownership before
leaving. Private/public visibility is fixed at creation. Archiving preserves
history and blocks sends, reactions, message edits/deletes, uploads and calls;
an active call must be ended first. Metadata uses `settingsVersion` conflict
checks (legacy conversations start at version 1; no destructive migration).

Presence means a recent authenticated connection heartbeat, not guaranteed
availability. Redis tracks connections independently: closing a browser does not
clear a still-active mobile connection. Heartbeats expire after 50 seconds; dots
refresh every 15 seconds and disappear while the observer reconnects.

Messages appear optimistically before server acknowledgement; pending/failed
status stays explicit. Manual retry retains the original idempotency key, and
unconfirmed sends survive reload in tab-scoped session storage. An old pending
composer send is migrated with its original key. Draft persistence is debounced,
typing remains possible during an outstanding send, and long text is collapsed
with a read-full control. The server still enforces 10,000 characters and 5 files
per message. There is no promise of zero network latency or offline delivery.
Do not store sensitive drafts on shared/untrusted devices; browser storage is
best-effort, not an encrypted delivery queue.

HTTP acknowledgements update the shared UI immediately, including the exact
thread parent returned by a reply. Socket and HTTP snapshots are reconciled by
message version, settings version, sequence and monotonic read cursors. During
a WebSocket outage, visible timelines reconcile every 3 seconds and conversation
lists every 5 seconds, without overlapping requests; hidden tabs pause polling.
Loaded older messages are refreshed too. Reconnects request a full reconciliation.
Polling requires a reachable HTTP API; it is not offline message delivery.

Development browser origins explicitly include localhost/127.0.0.1 on ports
3000, 3100 and 5173 for chat. Production still allows only `CLIENT_URL` and explicit
`CHAT_ALLOWED_ORIGINS`; do not use a wildcard. If production stays reconnecting,
verify the exact browser origin and the existing Nginx WebSocket upgrade config.

Calls now have an explicit device-check/prejoin screen. Devices start off and
are only enabled by the user. Missing infrastructure and connection failures are
visible and actionable. The dual-peer-connection SDK mode avoids a reproduced
WebKit offer-with-join configuration failure, without removing server ICE/TURN
configuration. A `/connected` acknowledgement reconciles actual provider
participants instead of trusting client claims. Media data-channel chat is
deliberately not exposed; minimize the call to use durable conversation history.

## Infrastructure requirements

* MongoDB replica set or Atlas. Transactions atomically persist a message, its
  per-conversation sequence, attachment associations and outbox event. Standalone
  MongoDB is deliberately unsupported; chat reports unavailable while the CRM
  remains running. Do not enable a replica set on a production database without
  a backup and a planned database migration.
* Shared Redis for realtime fan-out, presence, rate limits and single-use tickets.
  All app workers must use the same database and Redis configuration. Redis must
  be private/authenticated. Pub/Sub is transient; MongoDB provides durable history.
* Node >=22.22 (or a currently supported newer LTS) for the installed LiveKit
  client's dependency requirements; Python 3.13 is the tested backend runtime.
* Optional private S3 bucket + ClamAV to enable attachments.
* Optional LiveKit Cloud/self-hosted deployment to enable calls.

The existing mobile-dialer calling feature still uses a process-local connection
manager. Keep its current one-worker deployment until that feature is separately
migrated to shared messaging. The NEW chat module supports multiple workers.

## Existing EC2 deployment

No server changes have been applied automatically. Deploy from your normal
checkout/release process; the example server path is `/var/www/Xonier-CRM`.

1. Back up the database and existing release. Install backend dependencies with
   the service's virtualenv: `python -m pip install -r requirements.txt`.
2. Append the relevant settings from `CHAT.env.example` to the backend `.env`.
   Keep all existing CRM environment variables. Ensure `CLIENT_URL` is the actual
   browser origin (`https://app.trakeroo.com`), and configure additional origins
   explicitly if needed. Never put AWS/LiveKit secret keys in `NEXT_PUBLIC_*`.
3. Verify replica-set support with an authenticated DBA connection:
   `db.adminCommand({hello: 1})`. Expect `setName`, or a mongos `msg: "isdbgrid"`.
   Chat startup creates its own `chat_*` collections/indexes, without modifying
   existing CRM collections. The database role needs index and transaction access.
4. Frontend: set `NEXT_PUBLIC_BASE_URL=https://app.trakeroo.com/api` before build;
   run `npm ci`, then `npm run build` with the supported Node version. Restart the
   existing frontend service using your existing deployment procedure.
5. Your existing Nginx `location /api` already forwards to `127.0.0.1:8001`.
   Keep `proxy_http_version 1.1`, `Upgrade`, `Connection`, and the 300s timeouts
   previously configured. Both `/api/mobile/ws` and `/api/chat/ws` use that proxy.
   Do not replace the rest of your domain/certificate configuration.
6. `sudo nginx -t`, then `sudo systemctl restart myapp` and
   `sudo systemctl reload nginx`. Check `sudo journalctl -u myapp -n 100 --no-pager`
   for chat startup errors before directing users to `/communication`.

Chat WebSocket endpoint:

```text
wss://app.trakeroo.com/api/chat/ws?ticket=ONE_TIME_TICKET
```

Obtain the ticket using authenticated `POST /api/chat/ws-ticket`. It expires in
30 seconds and is consumed once. Use a new ticket for each reconnect. Access JWTs
are never put in the chat WebSocket URL. Browser `Origin` is checked, users/company
status is revalidated on heartbeats, and membership is checked on every action
and before event delivery. Use HTTPS/WSS in production. Do not log ticket bodies.

## S3 and scanner setup

The AWS account owner must create/provide a private bucket, an EC2 IAM instance
role restricted to that bucket's `chat/` prefix (`s3:GetObject`, `s3:PutObject`,
`s3:DeleteObject`), and the following bucket CORS policy (adjust origins for a
separate staging environment):

```json
[
  {
    "AllowedOrigins": ["https://app.trakeroo.com"],
    "AllowedMethods": ["POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 300
  }
]
```

Enable Block Public Access, encryption at rest and a lifecycle rule deleting
`chat/quarantine/` objects after one day. Set a retention policy for uploaded but
unattached `chat/files/` objects as part of your storage operations; automated
sealed-file garbage collection is not included. S3 object versions, if enabled,
need their own lifecycle policy. Keep sensitive data out of object names.

Run maintained ClamAV with current signature updates on a private endpoint.
Configure `StreamMaxLength` >= `CHAT_MAX_FILE_BYTES` and provision sufficient
scanner memory. `CHAT_S3_BUCKET` AND `CHAT_CLAMAV_HOST` must be configured before
file sharing appears available. Upload size/type are enforced in the signed POST
policy. Completion verifies metadata. The worker scans the actual bytes and
writes those exact clean bytes under a separate sealed key, preventing a still-
valid upload credential from replacing downloadable content. Scanner errors fail
closed; downloads require a clean verdict and current conversation membership.
Five scan failures reject the file; the sender must upload again.

Downloads use 60-second signed URLs and attachment disposition. Previously issued
signed URLs remain usable until expiry after removal, as expected for bearer URLs.
No preview renderer executes uploaded documents inside Trakeroo's origin.

## LiveKit setup

Create a LiveKit project (or provision a server), then set `LIVEKIT_URL`,
`LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`. Configure the LiveKit signed webhook:

```text
https://app.trakeroo.com/api/chat/media-webhook
```

Webhook events reconcile room participant state and close finished rooms. The
backend verifies the signature/body checksum using the SDK. Calls share the chat
conversation's membership, with five-minute room-specific join tokens. The
caller/group owner may end a call for everyone; other participants can leave.
Close an active call before removing a member. Active media rooms are also
reconciled periodically against company/member status so suspended users are
removed from the provider, with a nominal 30-second reconciliation interval.
Already-issued media grants remain bearer tokens until their five-minute expiry;
closed-room webhooks reject attempts to resurrect ended calls. Configure provider network/TURN
settings and quotas; self-hosted media needs its own network/security-group setup.
The normal Nginx WebSocket proxy alone does not carry WebRTC audio/video traffic.

Browser microphone/camera/screen permissions require HTTPS (localhost is allowed
for development). Call recording and end-to-end encryption are not enabled by
this module. Standard transport encryption is provided by HTTPS/WebRTC. Treat
the media provider and storage as processors of your company data.

## Reliability and operational checks

* Sender-provided UUIDs are idempotent per sender/conversation. A lost HTTP reply
  can be retried with the same UUID without another message being created.
* HTTP acknowledges only after MongoDB commits. A transactional outbox retries
  notifications through Redis; clients deduplicate and compare message versions.
* Reconnect uses cursor catch-up; periodic refresh heals missed events/edits.
  Cursor pagination uses transactionally allocated, committed sequence numbers.
* Redis restart does not erase message history. Monitor pending outbox count/age,
  Redis availability, socket connections, Mongo transaction latency, scanner queue,
  S3 failures and media quality. Current errors are emitted through Python logging;
  wire these into your normal alerting system before broad rollout.
* Run two-worker, reconnect/offline, expired-login, removed-member, S3 scan failure,
  cross-company access and multi-party call checks on staging. Load-test against
  your actual online-user/channel-size and call-participant targets. The initial
  conversation list is capped at 200, user search/public-channel discovery at 100,
  messages at 50 per cursor page, and a conversation at 100 members by default.
  These are explicit initial product bounds, not tested capacity promises.
* Back up/restore the chat collections with the main database. Set a business data
  retention policy before deployment; deleted messages remain tombstones and
  attachments remain stored until your retention process removes them.

## Tests

```bash
python -m pip install -r tests/requirements-chat.txt
python -m unittest discover -s tests -p 'test_chat*.py' -v
```

Tests default to isolated in-memory MongoDB/Redis. They never use `MONGO_URI`.
To exercise real MongoDB atomicity and concurrency, start a disposable LOCAL
replica set on port 27029 and run:

```bash
CHAT_TEST_MONGO_URI='mongodb://127.0.0.1:27029/?replicaSet=chat-test' \
  python -m unittest discover -s tests -p 'test_chat*.py' -v
```

Only localhost test URIs are accepted. Test databases have unique
`trakeroo_chat_test_*` names and are deleted after each test. Live S3, scanner and
multi-device LiveKit calls need separate staging credentials and are not exercised
by the database tests.

## Isolated local UI/media verification

`tests/chat_preview.py` is an opt-in loopback-only application with in-memory
Mongo/Redis, synthetic users and a fake local login. NEVER expose it through
Nginx, use it with real data, or deploy it as the application entry point.
`CHAT_PREVIEW_MESSAGE_DELAY=3` injects three seconds of message acknowledgement
latency to check optimistic sending and safe drafts.

For an optional local LiveKit test, from the backend directory:

```bash
docker run --rm --name trakeroo-communication-local-test \
  -p 127.0.0.1:17880:17880 -p 127.0.0.1:17881:17881 \
  -p 127.0.0.1:17882:17882/udp \
  -v "$PWD/tests/fixtures/livekit-local.yaml:/etc/livekit.yaml:ro" \
  livekit/livekit-server:v1.13.10 --config /etc/livekit.yaml

CHAT_PREVIEW=1 CHAT_PREVIEW_LOCAL_MEDIA=1 CHAT_PREVIEW_PORT=8137 \
  CHAT_PREVIEW_MESSAGE_DELAY=3 PYTHONPATH=.:tests \
  venv/bin/python tests/chat_preview.py
```

The checked-in YAML credentials are public, disposable TEST credentials. All
published ports are loopback-only; no real backend `.env` changes are needed.
The media image used during verification resolved to digest
`sha256:89ca9ce0791e18d6e03bf6e2c49ceb27e1c754eae8bd50c989386c1a5963791a`.
This Docker networking arrangement is not a production deployment recipe.

In a separate frontend terminal use:

```bash
TRAKEROO_UI_PREVIEW=1 NEXT_PUBLIC_BASE_URL=http://localhost:8137/api \
  npx next dev --webpack --port 3100
```

Open `http://localhost:3100/communication`. The preview uses a separate
`.next-ui-preview` build directory. `tests/local_media_probe.py` optionally joins
as synthetic Bob using an isolated virtualenv with `livekit` and `httpx`.
Run it with `CHAT_PREVIEW=1` and start a preview call within 120 seconds.
It publishes generated pixels/silent audio only; no hardware is captured and
it refuses non-loopback media URLs. Close the call and stop the test processes
after verification. A two-participant browser connection and decoded 320×180
synthetic video were verified locally; internet/NAT, real devices, large group
capacity, S3 integration and production reliability still require staging QA.

Frontend message merge tests (Node 22+):

```bash
node --experimental-strip-types --test tests/message-state.test.mjs
```

The unrelated existing `test_pipeline_stats.py` fails independently (status
breakdowns return empty mappings). Its source and tests were not changed by
this Communication update; do not report the entire repository suite as green.
