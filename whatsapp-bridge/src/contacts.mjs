// WhatsApp LIDs are opaque identifiers. They must never be displayed as phone numbers.
export function phoneFromJid(jid) {
  if (typeof jid !== 'string') return null;
  const match = /^(\d{7,15})(?::\d+)?@s\.whatsapp\.net$/.exec(jid);
  return match ? `+${match[1]}` : null;
}
export function displayContact(chat, contact = {}) {
  const phone = phoneFromJid(contact.phoneNumber) || phoneFromJid(chat.jid);
  const legacyId = chat.jid.split('@')[0];
  const savedName = typeof contact.name === 'string' ? contact.name.trim() : '';
  const group = chat.jid.endsWith('@g.us');
  const groupName = typeof chat.name === 'string' && chat.name !== legacyId ? chat.name : '';
  return { ...chat, phone, name: group ? groupName || 'WhatsApp group' : savedName || phone || 'Contact syncing…' };
}

export class ContactDirectory {
  constructor(collection) { this.collection = collection; }
  async absorb(sid, batch) {
    const valid = (batch || []).filter(c => c && [c.id, c.lid, c.phoneNumber].some(v => typeof v === 'string' && /@(lid|s\.whatsapp\.net)$/.test(v)));
    for (let offset = 0; offset < valid.length; offset += 200) {
      const chunk = valid.slice(offset, offset + 200);
      const allJids = [...new Set(chunk.flatMap(c => [c.id, c.lid, c.phoneNumber].filter(v => typeof v === 'string' && /@(lid|s\.whatsapp\.net)$/.test(v))))];
      if (!allJids.length) continue;
      const existing = await this.collection.find({ sid, jid: { $in: allJids } }).toArray();
      const phones = [...new Set([...allJids.filter(phoneFromJid), ...existing.map(r => r.phoneNumber).filter(Boolean)])];
      const linked = phones.length ? await this.collection.find({ sid, phoneNumber: { $in: phones } }).toArray() : [];
      const byJid = new Map([...existing, ...linked].map(r => [r.jid, r]));
      const byPhone = new Map();
      for (const r of [...existing, ...linked]) {
        if (r.phoneNumber) {
          if (!byPhone.has(r.phoneNumber)) byPhone.set(r.phoneNumber, []);
          byPhone.get(r.phoneNumber).push(r);
        }
      }
      const ops = new Map();
      for (const contact of chunk) {
        let aliases = [...new Set([contact.id, contact.lid, contact.phoneNumber].filter(v => typeof v === 'string' && /@(lid|s\.whatsapp\.net)$/.test(v)))];
        const previous = aliases.map(j => byJid.get(j)).filter(Boolean);
        const phoneNumber = aliases.find(phoneFromJid) || previous.find(r => r.phoneNumber)?.phoneNumber;
        if (phoneNumber && byPhone.has(phoneNumber)) {
          const phoneRows = byPhone.get(phoneNumber);
          aliases = [...new Set([...aliases, ...phoneRows.map(r => r.jid)])];
          previous.push(...phoneRows);
        }
        const name = typeof contact.name === 'string' && contact.name.trim() ? contact.name.trim() : previous.find(r => r.name)?.name;
        for (const jid of aliases) {
          const prev = ops.get(jid) || {};
          ops.set(jid, {
            ...(prev.phoneNumber || phoneNumber ? { phoneNumber: phoneNumber || prev.phoneNumber } : {}),
            ...(name !== undefined || prev.name !== undefined ? { name: name ?? prev.name } : {}),
          });
        }
      }
      if (ops.size) {
        await this.collection.bulkWrite([...ops.entries()].map(([jid, setFields]) => ({
          updateOne: {
            filter: { sid, jid },
            update: { ...(Object.keys(setFields).length ? { $set: setFields } : {}), $setOnInsert: { sid, jid } },
            upsert: true,
          },
        })));
      }
    }
  }
  async map(sid, mappings) {
    const batch = (mappings || [])
      .filter(item => item?.lid?.endsWith('@lid') && phoneFromJid(item.pn))
      .map(item => ({ id: item.lid, phoneNumber: item.pn }));
    if (batch.length) await this.absorb(sid, batch);
  }
  async conversationAliases(sid, jid) {
  if (jid.endsWith('@g.us')) return [jid];
  const contact = await this.collection.find({ sid, jid }).toArray();
  const phoneNumber = contact[0]?.phoneNumber || (phoneFromJid(jid) ? jid : null);
  if (!phoneNumber) return [jid];
  const aliases = await this.collection.find({ sid, phoneNumber }).toArray();
  return [...new Set([jid, phoneNumber, ...aliases.map(row => row.jid)])];
  }

  async decorate(sid, batch, recoveredPhones = new Map()) {
    const rows = await this.collection.find({ sid, jid: { $in: batch.map(chat => chat.jid) } }).toArray();
    const byJid = new Map(rows.map(row => [row.jid, row]));
    const phoneNumbers = [...new Set([
      ...rows.map(row => row.phoneNumber).filter(Boolean), ...recoveredPhones.values(),
    ])];
    const aliases = phoneNumbers.length ? await this.collection.find({
      sid, $or: [{ phoneNumber: { $in: phoneNumbers } }, { jid: { $in: phoneNumbers } }],
    }).toArray() : [];
    const names = new Map();
    for (const alias of aliases) {
      const phone = alias.phoneNumber || alias.jid;
      if (!names.has(phone) && typeof alias.name === 'string' && alias.name.trim()) names.set(phone, alias.name);
    }
    return batch.map(chat => {
      const contact = byJid.get(chat.jid) || {};
      const phoneNumber = contact.phoneNumber || recoveredPhones.get(chat.jid);
      return displayContact(chat, { ...contact, phoneNumber, name: contact.name || names.get(phoneNumber) });
    });
  }
}

export function mergeChatAliases(chats) {
  const conversations = new Map();
  for (const chat of chats) {
    // Only a verified phone mapping joins conversations. Equal names are insufficient.
    const jid = !chat.jid.endsWith('@g.us') && chat.phone ? `${chat.phone.slice(1)}@s.whatsapp.net` : chat.jid;
    const previous = conversations.get(jid);
    if (!previous || chat.timestamp > previous.timestamp) {
      conversations.set(jid, { ...chat, jid });
    }
  }
  return [...conversations.values()].sort((a, b) => b.timestamp - a.timestamp);
}
