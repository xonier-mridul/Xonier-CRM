# My Email: direct Google and Microsoft connections

This feature has no Nylas/Unipile subscription. Standard APIs and existing mailbox licences/limits apply. Agents open **Email Management → My Email**, click **Connect Google** or **Connect Microsoft**, select their own account and allow sending. The app supports one active connected sender per CRM user. Switching providers replaces the active connection only after successful authorization; existing CRM email history remains visible.

## Google setup (once)

Follow `gmail-setup.md`: enable Gmail API, configure External OAuth consent and test users, request only `openid`, email and `gmail.send`, then create a Web OAuth client. Existing Google credentials and grants continue to work. The default callback is still:

`http://localhost:8000/api/gmail/oauth/callback`

The universal callback `/api/mail/oauth/google/callback` is also supported if configured in Google and `GMAIL_REDIRECT_URI`; use exactly the same URL in both. Do not change a registered callback without updating the backend setting.

Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` server-side. The existing `scripts/configure_gmail.py` securely reads downloaded Google client JSON. Agents never see these credentials. External Google test refresh tokens generally expire after seven days; publish and complete applicable OAuth verification before public rollout. Send-only Gmail is a sensitive scope; this feature does not request restricted inbox scopes.

## Microsoft setup (once)

1. Open https://entra.microsoft.com/ with an authorized organization/developer account. Go to **Identity → Applications → App registrations → New registration**. An Entra tenant is needed to own the registration; agents do not each create a tenant.
2. Name the app **Xonier CRM Email**. For supported account types select **Accounts in any organizational directory and personal Microsoft accounts**. This allows Microsoft 365 work/school and personal Outlook.com, Hotmail and Live mailboxes. Use the correct audience at registration; a single-tenant/work-only app does not cover personal users.
3. Add a **Web** redirect URI (not SPA):

   `http://localhost:8000/api/mail/oauth/microsoft/callback`

4. Under **API permissions → Microsoft Graph → Delegated permissions**, add **Mail.Send** and **User.Read**. The authorization request also asks for `openid`, `profile`, `offline_access`. Do not add application-wide permissions or Mail.Read/Mail.ReadWrite for this send-only feature.
5. Copy **Application (client) ID**. Under **Certificates & secrets**, create a client secret and copy its **Value**, not the secret ID. Save the client ID/secret directly in the ignored backend `.env` (never chat, screenshots or frontend env):

   ```dotenv
   MICROSOFT_MAIL_CLIENT_ID=your-application-client-id
   MICROSOFT_MAIL_CLIENT_SECRET=your-client-secret-value
   MICROSOFT_MAIL_REDIRECT_URI=http://localhost:8000/api/mail/oauth/microsoft/callback
   ```

   Track the secret expiry and rotate it before it expires. `common` authority is used to support personal and organizational accounts.
6. Restart FastAPI. Open `http://localhost:3000/emailManagement/mail`, allow popups and choose **Connect Microsoft**. Sign in to a Microsoft account with an enabled Outlook/Exchange Online mailbox. A Microsoft login without a mailbox cannot send mail.
7. If a company disables user consent, its Microsoft admin must approve the app. The CRM cannot bypass that policy. Before broad company rollout, configure publisher/domain verification and consent according to the organizations' policies. OAuth consent does not itself purchase or create an Exchange Online licence/mailbox.
8. After connecting, authorize/send one test mail to a mailbox you control and check Sent Items, recipient delivery and the CRM outbox. No live emails are sent by automated tests.

## UI and behavior

- Shared page: `/emailManagement/mail`. Existing `/emailManagement/gmail` links continue to render the shared workspace, including lead compose parameters.
- Both providers use one composer, Cc/Bcc, attachments, existing email history and authorized lead activity. Send and connect require `email:send`; company-history view additionally needs company-admin role and `email:read`.
- Email is always sent with the connected agent's credentials, never a supplied From address. Admins can read authorized CRM history but cannot send as other agents.
- Google attachments: up to five files, 10 MB total. Microsoft: up to five files, 2 MB total in this version; encoded MIME must fit the direct Graph request. Large-attachment upload sessions would require a separate implementation and additional permissions. The UI shows the appropriate limit.
- Gmail accepts send with 200 plus a message ID; Graph accepts with 202 and an empty body. Microsoft history may therefore have no provider message ID. Sent means accepted for processing, not delivered or read. No inbox/reply sync is included; replies arrive in the user's mailbox.
- Refresh tokens use the existing Fernet encryption. Microsoft rotated refresh tokens are persisted only if the old grant still matches, preventing an in-flight refresh from overwriting a newly connected account/provider.
- State is random, browser-cookie-bound, single-use, provider-bound and expires after ten minutes. PKCE is used with both providers. Provider endpoints are fixed; client secrets and tokens never go to the browser. Profile identity comes from authenticated provider APIs.
- Microsoft disconnect removes local credentials/pending states. There is no delegated API to revoke only this application's grant; the UI explains that the user may remove app permissions in Microsoft account settings. It deliberately does not revoke all of the user's Microsoft sessions. Google disconnect attempts token revocation.
- Existing Mongo collection/field names beginning with `gmail_` are retained for backward compatibility. Connection rows now have provider `google` or `microsoft`; legacy rows without provider are Google. `email_history.provider` is `gmail` or `microsoft`; common outbox reads both. No credential migration or chat changes are necessary.
- Persistent send receipts prevent duplicate submission, including when visible outbox history is deleted. SMTP resend refuses both Gmail and Microsoft history to avoid silently changing the sender. Provider sending limits, mailbox subscriptions and standard API quotas still apply.

## Validation

Backend: `venv/bin/python -m unittest tests.test_gmail_service tests.test_microsoft_mail -v`.
Frontend: TypeScript and lint for `src/app/(dashboard)/emailManagement/mail/page.tsx`.
Real OAuth, tenant consent and delivery require configured provider clients and an account-owner-approved send. Automated checks use mocked provider replies, including Graph's empty 202 response.

References: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow , https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0 , https://developers.google.com/workspace/gmail/api/guides/sending .
