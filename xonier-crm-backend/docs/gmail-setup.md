# Per-agent Gmail: one-time administrator setup

The workspace now supports Microsoft too. See `email-setup.md` for the current shared My Email page and Microsoft setup. The Google setup below remains valid.
Agents never use Google Cloud Console. They open **Email Management → My Email → Connect Gmail**, choose a Google account and allow sending. This supports personal Gmail and Gmail-enabled Google Workspace accounts, subject to Workspace admin policies. Passwords stay with Google.

## Development setup (once)

1. Open https://console.cloud.google.com/ and create a project for **Xonier CRM Gmail**. Prefer a separate Gmail project/client from Calendar: Google grant revocation can affect related authorizations. An authorized company-owned project is appropriate for production; add your developer account as a project member.
2. In **APIs & Services → Library**, find **Gmail API** and enable it.
3. Open **Google Auth Platform** (older UI: OAuth consent screen). Set Branding to the app name, support email and developer contact email. Choose **External** audience to support ordinary personal Gmail accounts. Leave publishing in **Testing** and add your Gmail address under **Audience → Test users**. Add other agents only when testing their accounts. An Internal-only Workspace app works only for that organization and cannot connect arbitrary personal Gmail accounts.
4. In **Data Access**, request `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/gmail.send`. The code requests the equivalent `openid email gmail.send` scopes. Do not add inbox/read/modify or full-mailbox scopes for this feature.
5. In **Clients → Create client**, choose **Web application**. Name it **Xonier Gmail Local**. Add authorized JavaScript origin `http://localhost:3000` and this exact **Authorized redirect URI**:

   `http://localhost:8000/api/gmail/oauth/callback`

   The redirect is the backend callback, not the frontend page. Keep localhost/127.0.0.1 usage consistent. Download the client JSON. Do not create a service account and do not paste the client secret into chat, screenshots or frontend env files.
6. From the backend folder run:

   ```sh
   venv/bin/python scripts/configure_gmail.py --credentials /absolute/path/to/downloaded-client.json
   ```

   Or provide the local file path to Codex to configure it without displaying secrets. Keep downloaded credentials outside the repository. The script writes `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI` into the existing ignored backend `.env`.
7. Restart the FastAPI backend. Open `http://localhost:3000/emailManagement/mail`, allow popups, click **Connect Gmail**, select your added test user and allow **Send email on your behalf**. A testing/unverified-app notice may appear. Only authorize the app you created and recognize. Successful consent closes the popup and updates the CRM.
8. Send a single test email to a mailbox you control; confirm it in Gmail Sent, the recipient inbox, My Gmail outbox and (when launched from a lead) the lead activity. The developer must explicitly authorize any real test send. Automated tests do not send real mail.

Gmail refresh tokens for an External OAuth app in Testing generally expire after 7 days with this scope. The CRM will ask the agent to reconnect when authorization is invalid. This is a Google development-mode rule, not a per-agent setup requirement.

## Production (once, not per agent)

Set the real HTTPS backend callback URL in Google and `GMAIL_REDIRECT_URI`. Set the frontend `CLIENT_URL` to the actual origin used by agents. Use the same hostname for initiation and callback so the HttpOnly state cookie is returned. Provide a public home page, privacy policy, authorized domain ownership and a demonstration of how the sensitive `gmail.send` scope is used; complete Google OAuth verification as required unless an exception applies. Publish the app before broadly onboarding external users. Merely switching to Production is not a substitute for required verification. Workspace admins may need to approve the app. Gmail account sending limits and spam policies still apply.

## Behavior and security

- One Gmail connection per `(companyId, userId)`, with encrypted refresh token storage using the existing Fernet key. Tokens are never returned to frontend/admins. Keep the existing Fernet key stable.
- OAuth uses random single-use Mongo state, a browser-bound HttpOnly SameSite=Lax cookie, 10-minute expiry, PKCE and a verified Google userinfo email. Callbacks recheck active CRM user and company.
- Connect/send/disconnect require `email:send` and active company authorization. Admin company-history view also requires `email:read`; admin visibility does not allow sending as another user.
- Every send derives From from the server-stored connected Gmail. It never accepts a client-supplied sender address and never silently falls back to server SMTP.
- Plain-text compose, To/Cc/Bcc (20 recipients total), up to five attachments totaling 10 MB. Attachment binaries are sent to Gmail but not retained in CRM; only filename/size metadata is saved.
- CRM Gmail sends go into existing `email_history` (`provider=gmail`), appear in My Gmail outbox and can appear in the standard SMTP/template outbox. Existing template/bulk routes remain their original SMTP flow. This version does not import existing Gmail messages or read replies.
- Sends use a unique request key and content hash in a separate `gmail_send_requests` collection, so deleting visible outbox history does not enable replay. Google errors/timeouts with uncertain outcomes are not retried automatically. The user should check Gmail Sent before composing a new request. Sent means Gmail accepted the message, not delivery/read confirmation.
- The lead email icon pre-fills recipient and authorized lead ID. Lead access is checked with the existing lead service; successful sends append `email_sent` activity. If activity insertion fails after sending, history is marked `gmailActivityPending` for recovery.
- Disconnect removes the local connection and pending OAuth states and attempts Google token revocation. CRM sent history remains. If revocation cannot be confirmed, the UI tells the user to remove the app from Google Account third-party connections.

## Developer checks

From backend: `venv/bin/python -m unittest tests.test_gmail_service -v`.
From frontend: run TypeScript and lint for the new page. Live account selection, callback-cookie behavior, Google token refresh and actual delivery still need the one-time client setup and a user-authorized test send.

Primary references: https://developers.google.com/identity/protocols/oauth2/web-server , https://developers.google.com/workspace/gmail/api/guides/sending , https://developers.google.com/workspace/gmail/api/auth/scopes .
