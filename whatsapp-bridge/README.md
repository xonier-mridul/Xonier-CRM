# Xonier WhatsApp Linked Devices

This is an optional private Node worker for QR-linked personal/Business WhatsApp accounts. It replaces the unfinished Meta Cloud API setup page; there are no Meta credentials or verification steps.

## Local setup

1. Use Node 22 or later. Run `npm ci` in this directory.
2. Copy `.env.example` to `.env` and configure the same Mongo URI/database as FastAPI.
3. Generate a bridge secret (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Put it in this worker's `WHATSAPP_BRIDGE_SECRET` and FastAPI's `.env` as `WHATSAPP_BRIDGE_SECRET`. Never send this secret to the frontend.
4. Generate a separate 32-byte base64 `WHATSAPP_SESSION_KEY` using the command in `.env.example`. Keep it stable, private and backed up. Losing it requires unlinking/relinking sessions.
5. Set FastAPI `WHATSAPP_BRIDGE_URL=http://127.0.0.1:3101`, restart FastAPI, then run `npm start` here.
6. Sign in as an agent, open `/whatsapp`, acknowledge company visibility and click Connect. On your phone choose WhatsApp → Linked devices → Link a device and scan. Initial history depends on what WhatsApp supplies.
7. A company admin can select another connected agent to read synced conversations. The owner sends replies using their own session. Admin can disconnect another account. Disconnect deletes the copied chats, messages, outbound request records and session keys from Mongo; it does not delete messages from the phone. Signing out of Xonier does not unlink WhatsApp.

## Deployment

Run one persistent bridge process (PM2/systemd/container with exactly one replica). A Mongo lease prevents simultaneous workers owning the same sessions and expires after 45 seconds on crash. The bridge binds localhost by default. Do not expose its port publicly. Across machines, use a private network and encrypted transport. Backend HTTP calls use 30-second HMAC tickets; browser credentials are not forwarded. All browser access goes through the CRM's active-user/active-company checks. No public webhook/tunnel is needed.

Mongo collections: `whatsapp_connections`, `whatsapp_auth`, `whatsapp_chats`, `whatsapp_contacts`, `whatsapp_messages`, `whatsapp_sends`, `whatsapp_worker_leases`. Auth credentials and Signal keys use AES-256-GCM with authenticated tenant/user/slot context. Chat text is stored like other CRM data: restrict Mongo access and use encrypted disks/backups. QR exists only in worker memory and is returned exclusively to its owner, never logged or saved to Mongo. A unique phone index rejects the same number being linked to two users.

This first iteration supports QR, saved sessions, bounded reconnects, available history, newest 200 chats, newest 100 messages per conversation, plain text replies in existing individual chats, delivery status, and admin read access. Groups are read only. Media appears as a placeholder/caption and opens on the phone; attachments, new-chat compose, lead linking, search across message history, calls, edits/deletions and unread/read management are not implemented. Disappearing/view-once messages are excluded from sync. History completeness is not guaranteed. Number reassignment currently requires unlinking and relinking; no silent impersonation.

Outbound requests have client request IDs. Repeating a completed request returns its original message ID. A send interrupted before confirmation stays uncertain and is not sent again automatically; check the phone before composing a new send. Incoming upserts are unique per session/chat/message ID.

The library is unofficial. WhatsApp changes can break sessions and accounts may be restricted. This does not change that risk. No bulk sender or automated outreach is included.

## Validation

`npm test` checks ticket verification, tenant/agent scope and authenticated encryption. `npm run check` checks syntax. Live QR linking, history import and real send/delivery must be checked with an owner-present phone; automated checks do not establish WhatsApp delivery.

Contact labels use WhatsApp-synced saved contact names, with phone-number/LID mappings from history, contact events and saved Signal state. Unsaved contacts show a mapped international phone number; opaque LIDs never appear as phone numbers. When WhatsApp has not supplied a mapping/name yet, the UI says “Contact syncing…”. Existing linked sessions replay app-state on reconnect to recover names missed by the initial implementation. Complete phone address-book parity depends on the metadata WhatsApp shares with the linked device.

Phone-number and LID aliases are combined into a single inbox entry using the verified phone mapping (never by matching names). Message reads include both aliases and deduplicate WhatsApp message IDs while preserving the most advanced delivery status. Stored messages are retained; no destructive migration is required.
