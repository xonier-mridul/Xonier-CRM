# Team chat client contract

Base: `/api/chat`. Use the existing access-token Bearer header or accessToken
cookie for HTTP. Each operation validates the active company/user and conversation
membership. Responses use the existing `{success, status_code, message, data}`
envelope. This is a native WebSocket protocol, **not Socket.IO**.

## HTTP commands and queries

| Method / path | Purpose / body |
| --- | --- |
| GET `/capabilities` | Readiness, file/call configuration, limits, currentUserId |
| GET `/users?search=Alice` | Active company teammates (max 100 results) |
| GET `/conversations` | Your recent conversations, read positions, unread counts |
| POST `/conversations` | `{kind:"dm"\|"group"\|"channel", name, description, visibility:"private"\|"public", memberIds:[]}` |
| GET `/channels/discover` | Public company channels you have not joined |
| POST `/conversations/{cid}/join` | Join a public channel |
| POST `/conversations/{cid}/members` | Owner adds `{userIds:[]}` |
| DELETE `/conversations/{cid}/members/{uid}` | Owner removes a member; end active call first |
| GET `/conversations/{cid}/messages` | Latest 50 root messages; ascending seq in response |
| POST `/conversations/{cid}/messages` | Durable, idempotent send (example below) |
| PATCH `/conversations/{cid}/messages/{mid}` | Author edits `{text, version}`; 409 on stale version |
| DELETE `/conversations/{cid}/messages/{mid}` | Author replaces message with deletion tombstone |
| POST `/conversations/{cid}/messages/{mid}/reactions` | Toggle `{emoji:"👍"\|"❤️"\|"😂"\|"🎉"\|"👀"\|"✅"}` |
| POST `/conversations/{cid}/read` | Monotonic last-read cursor `{seq:42}` |
| GET `/conversations/{cid}/presence` | `{onlineIds:[]}`; presence expires after heartbeat timeout |
| POST `/conversations/{cid}/files` | `{name,contentType,size}` → approved direct-upload POST fields |
| POST `/conversations/{cid}/files/{fid}/complete` | Verify upload and queue scan |
| GET `/conversations/{cid}/files/{fid}` | Metadata and state: uploading/scanning/ready/rejected |
| GET `/conversations/{cid}/files/{fid}/download` | Short-lived URL; clean files only |
| GET `/conversations/{cid}/calls` | Recent 20 calls |
| POST `/conversations/{cid}/calls` | `{kind:"voice"\|"video"}` → existing/new active call |
| POST `/conversations/{cid}/calls/{id}/join` | `{token,serverUrl,call}` for LiveKit SDK |
| POST `/conversations/{cid}/calls/{id}/decline` | Dismiss invitation for this user |
| POST `/conversations/{cid}/calls/{id}/end` | Caller/conversation owner ends media room |
| POST `/ws-ticket` | Single-use, 30-second WebSocket ticket |

Send example:

```json
{
  "clientId": "1c321e90-8690-432a-850d-48142730c119",
  "text": "Hello team",
  "parentId": null,
  "attachmentIds": []
}
```

Generate clientId once per logical message. Retry an uncertain response with the
same ID and content. Reusing the ID with different content returns 409. A 201
response means MongoDB committed the message AND outbox event. Maintain a local
pending/failed state until confirmed, without inventing a committed sequence.

For threads, set parentId to a root message ID. Nested replies are not supported.
The send response also includes `threadParent`, the authoritative parent message
snapshot, on initial send and idempotent replay. Merge that parent by ID/version
immediately; never derive counts from the currently open thread or increment on
both HTTP and WebSocket acknowledgement. HTTP send/edit/delete/reaction responses
must feed the same local event reducer as realtime events.
Attachment IDs must be uploaded/completed by the sender into this conversation
and not already attached to another message. A scanning attachment can be sent,
but downloading it remains blocked until the scanner approves it.

Message query parameters: `before=<seq>` for older history, `after=<seq>` for
catch-up (mutually exclusive), `parentId=<rootId>` for thread replies,
`search=<text>` for literal text search within the accessible conversation. Result:
`{items: [...], hasMore: true|false}`. Root/thread results are separate. seq is
monotonic across all messages in one conversation; gaps within a thread/root
view are normal. Store a separate cursor for each view. On receiving an old
message event, compare version before replacing the existing message.
`messageIds=<comma-separated IDs>` refreshes up to 100 known messages in the same
conversation/root-or-thread view. This recovers changes on already-loaded older
rows outside the latest 50 messages after a socket outage. Normal tenant and
membership checks still apply; inaccessible IDs are never returned.

## Realtime connection

1. Obtain a ticket using authenticated POST `/ws-ticket`.
2. Connect to `wss://app.trakeroo.com/api/chat/ws?ticket=...`.
3. Await `{"event":"connected","userId":"..."}`.
4. Send `{"type":"ping"}` every 20 seconds; expect `{"event":"pong"}`.
5. Reconnect using a NEW ticket, exponential backoff and jitter. Fetch missed
   messages using after cursors; periodically refresh recent messages to recover
   edits/deletes and unread counts. HTTP history remains the source of truth.

Typing command (throttle on client to every two seconds):

```json
{"type":"typing","conversationId":"..."}
```

Server event envelope:

```json
{
  "eventId": "unique-outbox-event-id",
  "event": "message.created",
  "conversationId": "...",
  "data": {"id":"...","clientId":"...","seq":42,"version":1}
}
```

Supported events: `message.created`, `message.updated`, `conversation.updated`,
`conversation.removed`, `call.updated`, `typing`, `sync.required`, `connected`,
`pong`. Message/call data contains the complete current object. Typing data is
`{userId,name}` and should disappear after four seconds. Deduplicate persistent
event IDs; delivery can repeat after a worker crashes. UI message identity is
`senderId + clientId`, not clientId alone. A `sync.required` event indicates the
client should reload authoritative state (including after Redis reconnect or
backpressure). On conversation.removed immediately clear cached messages and
leave associated media. Keep caches scoped to the signed-in user/company.

Close codes: 4401 invalid/expired authentication or ticket, 4403 blocked browser
origin/authorization, 4429 connection/rate limit, 1009 oversized frame, 1007 bad
JSON, 1001 heartbeat timeout. Authentication revocation is checked on heartbeats;
do not keep retrying permanently blocked accounts without a successful login.

## Calls and uploads

Calls use the **LiveKit WebRTC SDK**, not the chat socket to transport media.
The backend chooses room identity and signs a five-minute join grant. Configure
signed `/api/chat/media-webhook` notifications on the provider. Do not allow a
client to choose a raw room name or mint its own token. See CHAT_DEPLOYMENT.md for
infrastructure, access revocation, network/TURN and external verification details.

S3 uploads: append every returned form field, then the file as the LAST form
field; POST to the returned upload URL without Trakeroo Authorization headers or
cookies. Call complete only after upload succeeds. Keep the bucket private.
This implementation does not send file bytes over WebSockets.
