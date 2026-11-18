# Xonier LinkedIn Integration Bridge

Private Node.js worker for personal LinkedIn integration inside Xonier CRM (mirroring `whatsapp-bridge`).

## Capabilities
- **Interactive Live Browser Login inside CRM**: Launches an isolated headless Google Chrome session streamed into the CRM so users can log in directly, solve 2FA/checkpoints visually, and use LinkedIn inside the CRM without iframe blocking.
- **Session Cookie Fallback**: Supports connecting via `li_at` (and optional `JSESSIONID`) for Google/Apple SSO LinkedIn accounts.
- **AES-256-GCM Encrypted Cookie Storage**: Session cookies are sealed per tenant/user in MongoDB (`linkedin_auth`).
- **Native CRM Inbox & Connections Sync**: Syncs LinkedIn messaging threads, messages, and 1st-degree connections (`linkedin_chats`, `linkedin_messages`, `linkedin_contacts`), with idempotent reply sending and company admin oversight.

## Local setup
1. Use Node 22 or later and ensure Google Chrome / Chromium is installed.
2. Copy `.env.example` to `.env` and set `MONGO_URI`, `DATABASE_NAME`, `LINKEDIN_BRIDGE_SECRET`, and `LINKEDIN_SESSION_KEY`.
3. Add `LINKEDIN_BRIDGE_URL=http://127.0.0.1:3102` and the matching `LINKEDIN_BRIDGE_SECRET` to `xonier-crm-backend/.env`.
4. Start the bridge with `npm start` (binds to `127.0.0.1:3102`).
