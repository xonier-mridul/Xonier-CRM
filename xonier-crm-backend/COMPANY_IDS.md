# Short company login IDs

`companies.companyId` is the human-facing **login ID**, for example `XON-1234`.
It is not `companies._id` or the ObjectId stored on users and tenant records.
Those references never change when a login ID is edited.

## Behaviour

- New registrations (including Super Admin-created companies) receive 3 uppercase
  ASCII letters derived from their name, a hyphen, and 4 randomly allocated digits.
  Xonier becomes `XON-####`, Infosys `INF-####`. Non-ASCII names without a usable
  Latin prefix fall back to `CMP`; admins can choose a different 3-letter prefix.
- Super Admin can edit any company's ID; Company Admin can edit only their own.
  Other users, including custom roles, cannot change company details through this API.
- IDs may be edited manually but must match `^[A-Z]{3}-[0-9]{4}$`. Input is trimmed
  and uppercased. The chosen prefix need not match the current company name.
  Changing a company name does **not** unexpectedly change its login ID.
- Current and previous IDs are reserved in `loginCodes`. A unique multikey index
  prevents another company claiming a retained ID, including IDs of deleted companies.
  Login, login OTP verification/resend, password reset and its OTP verification
  resolve both current and previous IDs. Legacy IDs work before any migration.
- An ID change and its activity log commit together in a MongoDB transaction.
  Partial settings/status updates do not overwrite concurrent code changes.
- A remembered company ID is an identifier, **not** a password or security boundary;
  email, password/OTP, tenant authorization and subscription checks still apply.

## API/UI

`PATCH /api/companies/{internalObjectId}` with `{"companyId":"XON-1234"}`.
Returns 403 for unauthorized editors, 422 for an invalid format and 409 if an ID
is in use or reserved. Successful responses include the current `companyId`.

`GET /api/companies/{internalObjectId}/code-suggestion` returns
`{"data":{"companyId":"XON-1234"},...}` without changing or reserving the ID.
A competing save can still claim a suggestion; choose/generate another on 409.

The **Company login ID** card appears on Super Admin's Edit Company screen and
Company Settings. Generate or type an ID, then explicitly Save ID. Saving only
this card preserves unsaved company details. Copy/share the new ID with the team.

Creation/registration response `companyId` remains the **internal ObjectId** for
backward compatibility; the added `companyCode` contains the new human login ID.

## Existing companies / deployment

Deploy backend and frontend together, and ensure the unique
`unique_company_login_codes` index is created successfully by Beanie at startup.
MongoDB replica-set transactions are required (as for existing registration).

Existing companies are not silently renamed at application startup. Admins can
use the ID card individually. To shorten all old IDs, first back up MongoDB and
run from the backend directory with the usual application environment:

```sh
venv/bin/python -m scripts.migrate_company_codes
venv/bin/python -m scripts.migrate_company_codes --apply
```

The first command only previews. `--company <internalObjectId>` limits either run
to one company. Apply updates only the login ID, alias reservations and timestamp;
it does not alter user/tenant relationships or encrypted company contact fields.
It includes deleted companies so their IDs remain reserved. It is resumable,
skips already formatted IDs and skips records concurrently edited by an admin.
Legacy IDs remain usable after migration. Keep aliases when restoring a backup;
removing them could allow identifier reassignment and break old login links.

## Verification

```sh
PYTHONPATH=.:tests venv/bin/python -m unittest discover -s tests -p 'test_company_codes.py' -v
# Set COMPANY_CODE_TEST_MONGO_URI to a disposable LOCAL replica set to exercise
# real unique multikey indexes, transaction rollback, races and Beanie services.
```

No migration or production database changes are performed by tests.

For a synthetic UI preview, start the built frontend on localhost:3100 and run
`tests/company_code_preview.py` with `COMPANY_CODE_PREVIEW=1`,
`PYTHONPATH=.:tests` and `COMPANY_CODE_TEST_MONGO_URI` pointing to the disposable
local replica set. Open `http://localhost:8000/__preview/company-admin` or
`http://localhost:8000/__preview/super-admin`. This fixture uses the actual company
service but synthetic authentication and a random database dropped on shutdown.
It must never be deployed or bound to a public interface.
