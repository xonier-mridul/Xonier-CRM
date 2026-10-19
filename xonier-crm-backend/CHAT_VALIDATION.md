# Chat implementation handoff

## Verified locally

* 19 chat tests passed against a disposable MongoDB 8.0.17 single-node replica
  set, including real atomic rollback and 12 concurrent sends. Test databases
  were uniquely named and removed by test teardown. No production database was
  contacted. The temporary MongoDB process was stopped after verification.
* Tests cover tenant/member isolation, DM uniqueness, transactional outbox recovery
  after Redis publish failure, idempotent retries/content conflicts, read cursors,
  pagination/catch-up, edits/deletion/reactions/threads, suspended accounts,
  file quarantine/clean-byte sealing, room-specific media grants, media revocation,
  and WebSocket Origin/ticket replay/heartbeat/invalid-JSON behavior.
* MongoDB transactions are real in that run. Redis cross-worker delivery, S3,
  ClamAV and LiveKit service calls are isolated fakes/mocks in automated tests;
  they do not constitute a live provider/network verification.
* Browser checks with synthetic local users verified channel history, unread count
  clearing, direct conversation creation, send/retry, thread replies, reaction and
  conversation search. The preview never uses production users or messages.
  A final browser check also verified restoring an unsent draft after reload and
  successfully sending it. Dashboard/navbar offsets now collapse with the sidebar
  below the desktop breakpoint; the narrow-window layout was visually verified.
* Frontend chat ESLint and production Webpack build passed. Python module syntax
  and installed dependency consistency checks passed.

## Existing build issues corrected

Next.js rejected a dashboard utility export and support/referral helper components
that were named `page.tsx` despite requiring component-only props. The date helper
was extracted into `src/lib/formatDate.ts`; those helper files were renamed to
component filenames and their imports updated. Their parent ticket/referral pages
continue to use them. The accidental helper URLs are no longer routes. An old
generated development types cache was moved aside in `/private/tmp` before build.

## Existing test failures outside chat

The original `tests/test_pipeline_stats.py` fails independently (3 failures and
32 error/subtest reports). Its tests and `app/utils/pipeline_stats.py` were not
changed by this implementation. Therefore the whole repository test suite is
NOT green, even though the chat-specific suite is green.

## Still required before live rollout

1. Confirm the production MongoDB is a replica set/Atlas, Redis is shared/private,
   and the server's Node version supports the new SDK dependencies.
2. Deploy code and backend/frontend dependencies using the normal EC2 release
   procedure. No SSH/production deployment was performed from this chat.
3. Configure private S3/IAM/CORS and a maintained ClamAV service for attachments.
4. Configure LiveKit URL/key/secret and signed webhooks for calls.
5. Exercise clean/infected file uploads and multi-device/group calls on staging,
   including restrictive-network TURN fallback, camera/mic permissions, background
   tabs, connection changes and access revocation. Set usage quotas and alerts.
6. Load-test your actual concurrent users/room sizes and verify database backups,
   storage lifecycle and retention policies. This implementation has not been
   benchmarked at a promised production concurrency level.

Read `CHAT_DEPLOYMENT.md` for setup and `CHAT_API.md` for the mobile/web client
contract. Recording, PSTN/mobile-number dialing, mobile push, DND/mentions,
pinning, guests and full Slack feature parity are not included in this release.
