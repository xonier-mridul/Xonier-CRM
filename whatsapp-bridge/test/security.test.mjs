import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { scope, verifyTicket, seal, unseal } from '../src/security.mjs';
const secret = 'test-secret';
const actor = { company: 'a'.repeat(24), user: 'b'.repeat(24), aud: 'whatsapp-bridge', exp: Math.floor(Date.now() / 1000) + 30 };
function ticket(data) {
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${encoded}.${createHmac('sha256', secret).update(encoded).digest('base64url')}`;
}
test('tickets reject tampering, expiry, wrong audience and malformed tenant ids', () => {
  assert.equal(verifyTicket(ticket(actor), secret).user, actor.user);
  assert.throws(() => verifyTicket(ticket(actor), 'wrong-secret'));
  assert.throws(() => verifyTicket(ticket({ ...actor, exp: 1 }), secret));
  assert.throws(() => verifyTicket(ticket({ ...actor, aud: 'other' }), secret));
  assert.throws(() => verifyTicket(ticket({ ...actor, company: '../other' }), secret));
});
test('agent cannot read another agent; admin scope remains in their own company', () => {
  assert.throws(() => scope(actor, 'c'.repeat(24)));
  assert.equal(scope({ ...actor, admin: true }, 'c'.repeat(24)), `${actor.company}:${'c'.repeat(24)}`);
  assert.throws(() => scope({ ...actor, admin: true }, '../other'));
});
test('session data is authenticated and bound to its tenant/user/key slot', () => {
  const key = randomBytes(32);
  const ciphertext = seal('private-session', key, 'company:user:creds');
  assert.equal(unseal(ciphertext, key, 'company:user:creds'), 'private-session');
  assert.throws(() => unseal(ciphertext, key, 'other:user:creds'));
  assert.throws(() => unseal(ciphertext, randomBytes(32), 'company:user:creds'));
});
