import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function verifyTicket(ticket, secret, now = Date.now()) {
  if (!ticket || ticket.length > 4096) throw new Error('Unauthorized');
  const [payload, signature, extra] = ticket.split('.');
  const expected = createHmac('sha256', secret).update(payload || '').digest();
  const actual = Buffer.from(signature || '', 'base64url');
  if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Unauthorized');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (data.aud !== 'linkedin-bridge' || !Number.isInteger(data.exp) || data.exp * 1000 <= now || data.exp * 1000 > now + 600000
    || !/^[a-f0-9]{24}$/.test(data.company || '') || !/^[a-f0-9]{24}$/.test(data.user || '')) throw new Error('Unauthorized');
  return data;
}

export function signTicket(actor, secret, ttlSeconds = 300) {
  const payload = {
    company: String(actor.company),
    user: String(actor.user),
    aud: 'linkedin-bridge',
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    name: String(actor.name || '').slice(0, 100),
    admin: Boolean(actor.admin),
    ua: String(actor.ua || '').slice(0, 300),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
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
  if (!/^[a-f0-9]{24}$/.test(owner) || (owner !== actor.user && actor.admin !== true)) {
    throw Object.assign(new Error('Connection not found'), { status: 404 });
  }
  return `${actor.company}:${owner}`;
}
