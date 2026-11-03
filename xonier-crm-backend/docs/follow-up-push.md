# Lead follow-up push delivery

The backend owns due times. Lead connection-status updates and call-outcome edits save
`followUpAt` in UTC and update a MongoDB reminder outbox in the same transaction.
An interval worker claims due outbox rows every 15 seconds. Claims are atomic across
API processes, retry transient failures until 15 minutes after the due time, and
recheck reminder version, lead, user, company and current token before FCM send.
Existing saved lead follow-ups are backfilled when they enter the five-minute
upcoming window. A push is considered delivered once FCM accepts it; device
delivery and sound still depend on platform permissions and connectivity.

## Mobile contract

The actual backend route is `POST /api/auth/login` and the existing company key is
`companyId` (string). The mobile app adds `fcm` to that request:

```json
{"companyId":"YOUR_COMPANY_ID","email":"user@example.com","password":"...","fcm":"CURRENT_FCM_REGISTRATION_TOKEN"}
```

`fcm` is optional for existing web logins, but a supplied empty or placeholder
token is rejected. The token stays encrypted in the short-lived OTP challenge.
It becomes the user's active device token only after `POST /api/auth/verify-login-otp`
succeeds. OTP verification and resend payloads do not gain an `fcm` field. A
resend carries a still-valid pending token forward. `POST /api/auth/logout`
removes the active token. This contract stores one active token per user/company;
the newest verified mobile login replaces the earlier device.

For native FCM token rotation during an authenticated session, call the new
`PUT /api/auth/push-token` endpoint with `{ "fcm": "CURRENT_TOKEN" }` using the
normal session authentication. The mobile app must wire its existing
`followUpPushTokenChanged` callback to this endpoint; otherwise a refreshed
token is registered on the next login only. The API never returns or logs tokens.

The FCM data contains `type=follow_up_due`, `reminderId`, `leadId`, `userId`,
`companyId`, `version`, `scheduledAt`, `expiresAt`, `leadName`, `title` and `body`.
All values are strings. Android receives high-priority data only. The same
message has an Apple-only APNs alert, `follow_up_alarm.caf` sound and
`lead-follow-up-actions` category. There is no common notification block, so
Android's native custom renderer remains responsible for display and actions.

## Server configuration

The service-account credential pasted in chat must be revoked and replaced.
Install the rotated credential outside the repository with access limited to
the backend service user. Do not put its JSON in Git, the app, an API response,
or a shell transcript. Configure the backend systemd service with:

```text
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/to/rotated-firebase-service-account.json
FOLLOW_UP_PUSH_ENABLED=true
FCM_PROJECT_ID=trakeroo
```

Install the pinned `firebase-admin` requirement in the backend virtualenv and
restart the backend after the environment is configured. The worker remains
disabled until `FOLLOW_UP_PUSH_ENABLED=true`. Firebase Cloud Messaging HTTP v1
must be enabled for the project. For iOS, a valid APNs authentication key for
`com.trakeroo` must also be configured in Firebase; the plist alone is insufficient.
No key is bundled with this change.

## Verification

Use a real Android device and a correctly signed physical iPhone. Verify the
device token is present only after a successful OTP, then schedule a lead
follow-up a few minutes ahead. Confirm one alert at the due time in foreground,
background and terminated states. Edit or cancel before due and confirm the old
version does not send. Verify logout, token rotation, wrong-account isolation,
temporary network failure and an invalid token. Inspect the outbox by lead ID
(`lead_follow_up_reminders`) and the single-device token collection
(`mobile_push_tokens`) without printing encrypted tokens or credentials.
