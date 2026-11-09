import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function verifyTicket(ticket, secret, now = Date.now()) {
  if (!ticket || ticket.length > 4096) throw new Error('Unauthorized');
  const [payload, signature, extra] = ticket.split('.');
  const expected = createHmac('sha256', secret).update(payload || '').digest();
  const actual = Buffer.from(signature || '', 'base64url');
  if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Unauthorized');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (data.aud !== 'whatsapp-bridge' || !Number.isInteger(data.exp) || data.exp * 1000 <= now || data.exp * 1000 > now + 60000
    || !/^[a-f0-9]{24}$/.test(data.company || '') || !/^[a-f0-9]{24}$/.test(data.user || '')) throw new Error('Unauthorized');
  return data;
}

export function seal(value, key, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function unseal(value, key, context) {
  const data = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}
export function scope(actor, owner = actor.user) {
  if (!/^[a-f0-9]{24}$/.test(owner) || (owner !== actor.user && actor.admin !== true)) throw Object.assign(new Error('Connection not found'), { status: 404 });
  return `${actor.company}:${owner}`;
}
