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
    for (const contact of batch || []) {
      let aliases = [...new Set([contact.id, contact.lid, contact.phoneNumber].filter(value => typeof value === 'string' && /@(lid|s\.whatsapp\.net)$/.test(value)))];
      if (!aliases.length) continue;
      const previous = await this.collection.find({ sid, jid: { $in: aliases } }).toArray();
      const phoneNumber = aliases.find(phoneFromJid) || previous.find(row => row.phoneNumber)?.phoneNumber;
      if (phoneNumber) {
        const linked = await this.collection.find({ sid, phoneNumber }).toArray();
        aliases = [...new Set([...aliases, ...linked.map(row => row.jid)])];
        previous.push(...linked);
      }
      const name = typeof contact.name === 'string' ? contact.name : previous.find(row => row.name)?.name;
      for (const jid of aliases) await this.collection.updateOne({ sid, jid }, { $set: {
        ...(phoneNumber ? { phoneNumber } : {}), ...(name !== undefined ? { name } : {}),
      }, $setOnInsert: { sid, jid } }, { upsert: true });
    }
  }
  async map(sid, mappings) {
    for (const item of mappings || []) {
      if (!item.lid?.endsWith('@lid') || !phoneFromJid(item.pn)) continue;
      await this.absorb(sid, [{ id: item.lid, phoneNumber: item.pn }]);
    }
  }
  async conversationAliases(sid, jid) {
  if (jid.endsWith('@g.us')) return [jid];
  const contact = await this.collection.find({ sid, jid }).toArray();
  const phoneNumber = contact[0]?.phoneNumber || (phoneFromJid(jid) ? jid : null);
  if (!phoneNumber) return [jid];
  const aliases = await this.collection.find({ sid, phoneNumber }).toArray();
  return [...new Set([jid, phoneNumber, ...aliases.map(row => row.jid)])];
  }

  async decorate(sid, batch) {
    const rows = await this.collection.find({ sid, jid: { $in: batch.map(chat => chat.jid) } }).toArray();
    const byJid = new Map(rows.map(row => [row.jid, row]));
    const phoneNumbers = [...new Set(rows.map(row => row.phoneNumber).filter(Boolean))];
    const aliases = phoneNumbers.length ? await this.collection.find({ sid, phoneNumber: { $in: phoneNumbers } }).toArray() : [];
    return batch.map(chat => {
      const contact = byJid.get(chat.jid) || {};
      const savedAlias = aliases.find(row => row.phoneNumber === contact.phoneNumber && typeof row.name === 'string' && row.name.trim());
      return displayContact(chat, { ...contact, name: contact.name || savedAlias?.name });
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
