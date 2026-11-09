# Gmail and Microsoft email setup

Set up both providers once for Xonier CRM. Agents then connect their own mailbox from **Email Management → My Email**.

## 1. Google (Gmail and Google Workspace)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project named **Xonier CRM Email**.
2. Go to **APIs & Services → Library**, search for **Gmail API**, and click **Enable**.
3. Open **Google Auth Platform** and complete **Branding** with the app name, support email, and developer contact email.
4. Under **Audience**, choose **External**, keep the app in **Testing**, and add the Gmail address you will use under **Test users**.
5. Under **Data Access**, add these scopes.

   ```text
   openid
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/gmail.send
   ```

6. Go to **Clients → Create client → Web application**. Add the following **Authorized redirect URI**.

   ```text
   http://localhost:8000/api/gmail/oauth/callback
   ```

7. Download the client JSON and keep it outside the repository. From the backend folder, run the following command with the downloaded file path. The script saves the credentials to the backend `.env`.

   ```bash
   venv/bin/python scripts/configure_gmail.py --credentials "/absolute/path/to/client-secret.json"
   ```

   You can also set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI` directly in the backend `.env`.

## 2. Microsoft (Outlook.com, Hotmail, Live, and Microsoft 365)

1. Open [Microsoft Entra admin center](https://entra.microsoft.com/) in the tenant that will own the CRM app. Go to **App registrations → New registration**.
2. Name it **Xonier CRM Email**. Select **Accounts in any organizational directory and personal Microsoft accounts** so both personal and work mailboxes can connect.
3. Under **Authentication**, add a **Web** redirect URI.

   ```text
   http://localhost:8000/api/mail/oauth/microsoft/callback
   ```

4. Go to **API permissions → Add a permission → Microsoft Graph → Delegated permissions**. Add **Mail.Send** and **User.Read**.
5. Copy the **Application (client) ID** from **Overview**. Under **Certificates & secrets**, create a client secret and copy its **Value** while it is visible.
6. Add these settings to `xonier-crm-backend/.env`. Keep the secret in that local file.

   ```dotenv
   MICROSOFT_MAIL_CLIENT_ID=your-application-client-id
   MICROSOFT_MAIL_CLIENT_SECRET=your-client-secret-value
   MICROSOFT_MAIL_REDIRECT_URI=http://localhost:8000/api/mail/oauth/microsoft/callback
   ```

## 3. Connect and test

1. Restart the FastAPI backend after saving the credentials. For the local setup, use `localhost` consistently for the frontend and backend. The existing backend `CLIENT_URL` should match the frontend origin, normally `http://localhost:3000`.
2. Open [My Email](http://localhost:3000/emailManagement/mail) as an agent with email sending permission.
3. Click **Connect Google** or **Connect Microsoft**, choose your mailbox, and allow sending. Each agent can have one active sender. You can switch providers to test both.
4. Send a test email to a mailbox you control. Check the recipient inbox, the provider’s Sent folder, and the CRM outbox.

Before production, register the real HTTPS backend callback URLs and update the corresponding environment variables. Google External Testing connections generally need reconnecting after seven days. Public Google rollout may require OAuth verification, and some Microsoft 365 organizations require their admin to approve the app.

[Google OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) · [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) · [Microsoft app registration](https://learn.microsoft.com/en-us/graph/auth-register-app-v2) · [Microsoft send permissions](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
