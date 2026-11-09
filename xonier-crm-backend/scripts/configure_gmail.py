"""Install a downloaded Google Web OAuth client without displaying credentials."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import dotenv_values, set_key

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--credentials', required=True, type=Path, help='Downloaded Google OAuth client JSON (web application)')
parser.add_argument('--redirect-uri', default='http://localhost:8000/api/gmail/oauth/callback')
args = parser.parse_args()
parsed = urlsplit(args.redirect_uri)
if parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in {'localhost', '127.0.0.1'}):
    parser.error('Use HTTPS, or HTTP on localhost for development')
try:
    web = json.loads(args.credentials.read_text()).get('web', {})
    if not web.get('client_id') or not web.get('client_secret'):
        parser.error('Download a Web application OAuth client JSON, not a service account or Desktop client')
    if args.redirect_uri not in web.get('redirect_uris', []):
        parser.error('Add the exact callback URL to this OAuth client in Google Cloud, then download it again')
except (OSError, ValueError):
    parser.error('Unable to read Google OAuth client JSON')
root = Path(__file__).resolve().parents[1]
env = root / '.env'
if not env.exists():
    parser.error('Configure the existing backend .env first')
settings = dotenv_values(env)
if settings.get('GOOGLE_CALENDAR_CLIENT_ID') == web['client_id']:
    parser.error('Use a dedicated Gmail OAuth client so disconnecting Gmail does not revoke Calendar access')
for key, value in {'GMAIL_CLIENT_ID':web['client_id'], 'GMAIL_CLIENT_SECRET':web['client_secret'], 'GMAIL_REDIRECT_URI':args.redirect_uri}.items():
    set_key(env, key, value)
os.chmod(env, 0o600)
print('Gmail credentials saved in backend .env. No secrets were displayed.')
print('Callback URL:', args.redirect_uri)
print('Restart the FastAPI backend, then open Email Management → My Gmail.')
