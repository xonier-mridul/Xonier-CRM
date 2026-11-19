export function extractProfileId(urnOrUrl) {
  if (!urnOrUrl) return '';
  const raw = String(urnOrUrl).trim();
  const match = raw.match(/urn:li:(?:fsd_profile|fs_miniProfile|fsd_miniProfile|member):([^,)\s/]+)/i);
  if (match?.[1]) return match[1];
  if (!raw.startsWith('urn:li:') && !raw.includes('://') && /^[0-9A-Za-z_-]{4,120}$/.test(raw)) {
    return raw;
  }
  return '';
}

export function extractHandleFromUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url, 'https://www.linkedin.com');
    const match = parsed.pathname.match(/\/in\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function extractThreadId(urn) {
  if (!urn) return '';
  const s = String(urn).trim();
  const paren = s.match(/,([^)]+)\)/);
  if (paren?.[1]) return paren[1].trim();
  const parts = s.split(':');
  return (parts[parts.length - 1] || s).trim();
}

export function encodeRestliValue(val) {
  return encodeURIComponent(String(val ?? ''))
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

export function buildMessagesGraphqlUrl(capturedApi, conversationUrn) {
  if (!capturedApi || !conversationUrn) return null;
  const fullUrn = String(conversationUrn).trim();
  if (!fullUrn) return null;
  const encodedUrn = encodeRestliValue(fullUrn);

  if (typeof capturedApi.messagesUrl === 'string' && capturedApi.messagesUrl.trim()) {
    let raw = capturedApi.messagesUrl.trim();
    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        raw = parsed.pathname + parsed.search;
      } catch {
        // Keep raw if URL parsing fails
      }
    }
    const isSyncTokenOnly = /syncToken:/i.test(raw) && !/conversationUrn:/i.test(raw);
    if (!isSyncTokenOnly && /conversationUrn:/i.test(raw)) {
      let updated = raw.replace(/(conversationUrn:)[^,)&\s]+/i, `$1${encodedUrn}`);
      if (/deliveredAt:\d+/i.test(updated)) {
        updated = updated.replace(/(deliveredAt:)\d+/i, `$1${Date.now()}`);
      }
      return updated;
    }
  }

  if (typeof capturedApi.messagesQueryId === 'string' && capturedApi.messagesQueryId.trim()) {
    return `/voyager/api/voyagerMessagingGraphQL/graphql?variables=(conversationUrn:${encodedUrn})&queryId=${encodeURIComponent(capturedApi.messagesQueryId.trim())}`;
  }

  return null;
}

function unwrapText(val) {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    if (typeof val.text === 'string') return val.text;
    if (typeof val.string === 'string') return val.string;
  }
  return '';
}

function toUnixSeconds(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
}

function indexPayloadObjects(payload) {
  const index = new Map();
  const visited = new WeakSet();

  const register = obj => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    const keyCount = Object.keys(obj).length;
    for (const keyField of ['entityUrn', '$id', 'backendUrn']) {
      const key = obj[keyField];
      if (typeof key === 'string' && key) {
        const existing = index.get(key);
        if (!existing || keyCount > Object.keys(existing).length) {
          index.set(key, obj);
        }
      }
    }
  };

  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    register(node);
    for (const val of Object.values(node)) {
      if (val && typeof val === 'object') walk(val);
    }
  };

  if (Array.isArray(payload?.included)) {
    for (const item of payload.included) register(item);
  }
  walk(payload);
  return index;
}

function resolveRef(index, ref) {
  if (!ref) return null;
  if (typeof ref === 'string') return index.get(ref) || null;
  if (typeof ref === 'object') {
    const keys = Object.keys(ref);
    const id = ref.entityUrn || ref['$id'] || ref.backendUrn;
    if (id && keys.length <= 3) {
      return index.get(id) || ref;
    }
    return ref;
  }
  return null;
}

function normalizeIdentity(selfIdentity = {}) {
  const memberUrn = String(selfIdentity.memberUrn || '').trim();
  const profileId = String(selfIdentity.profileId || extractProfileId(memberUrn) || '').trim();
  const handle = String(selfIdentity.handle || '').trim().toLowerCase();
  const profileName = String(selfIdentity.profileName || '').trim();
  return { memberUrn, profileId, handle, profileName };
}

function isSelfParticipant(info, self) {
  if (info.distance === 'SELF') return true;
  if (self.profileId && info.profileId && info.profileId === self.profileId) return true;
  if (self.memberUrn && info.urn && info.urn === self.memberUrn) return true;
  if (self.handle && info.handle && info.handle.toLowerCase() === self.handle) return true;
  return false;
}

function extractParticipantInfo(index, rawParticipant, self) {
  const p = resolveRef(index, rawParticipant) || (typeof rawParticipant === 'object' ? rawParticipant : null);
  if (!p) return null;

  const pType = resolveRef(index, p.participantType) || p.participantType || {};
  const modernMember = resolveRef(index, pType['*member'] || pType.member);
  const modernOrg = resolveRef(index, pType['*organization'] || pType.organization);
  const modernCustom = resolveRef(index, pType['*custom'] || pType.custom);

  if (modernMember || p.hostIdentityUrn || pType.member || pType.organization || pType.custom) {
    const entity = modernMember || modernOrg || modernCustom || p;
    const first = unwrapText(entity.firstName).trim();
    const last = unwrapText(entity.lastName).trim();
    const fullName = `${first} ${last}`.trim() || unwrapText(entity.name).trim();
    const headline = unwrapText(entity.headline || entity.occupation).trim();
    const rawProfileUrl = typeof entity.profileUrl === 'string' && entity.profileUrl.trim() ? entity.profileUrl.trim() : null;
    const handle = (typeof entity.publicIdentifier === 'string' && entity.publicIdentifier.trim())
      || extractHandleFromUrl(rawProfileUrl)
      || null;
    const profileUrl = rawProfileUrl || (handle ? `https://www.linkedin.com/in/${handle}/` : null);
    const urn = String(p.hostIdentityUrn || entity.memberUrn || entity.entityUrn || p.entityUrn || '').trim();
    const profileId = extractProfileId(urn) || extractProfileId(entity.memberUrn) || extractProfileId(entity.entityUrn);
    const distance = typeof entity.distance === 'string' ? entity.distance : (typeof p.distance === 'string' ? p.distance : '');

    if (!fullName && !urn && !handle) return null;
    return {
      name: fullName,
      headline,
      handle,
      profileUrl,
      urn,
      profileId,
      distance,
      isSelf: isSelfParticipant({ urn, profileId, handle, distance }, self),
    };
  }

  const legacyMember = resolveRef(
    index,
    p['*messagingMember']
      || p.messagingMember
      || p['com.linkedin.voyager.messaging.MessagingMember']
      || p,
  ) || p;
  const legacyMini = resolveRef(
    index,
    legacyMember?.['*miniProfile']
      || legacyMember?.miniProfile
      || legacyMember?.['com.linkedin.voyager.messaging.MessagingMember']?.['*miniProfile']
      || legacyMember?.['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile
      || p?.['*miniProfile']
      || p?.miniProfile,
  ) || legacyMember;

  if (!legacyMini) return null;
  const first = unwrapText(legacyMini.firstName).trim();
  const last = unwrapText(legacyMini.lastName).trim();
  const fullName = `${first} ${last}`.trim() || unwrapText(legacyMini.name).trim();
  const handle = typeof legacyMini.publicIdentifier === 'string' && legacyMini.publicIdentifier.trim()
    ? legacyMini.publicIdentifier.trim()
    : extractHandleFromUrl(legacyMini.profileUrl);
  const headline = unwrapText(legacyMini.occupation || legacyMini.headline).trim();
  const profileUrl = typeof legacyMini.profileUrl === 'string' && legacyMini.profileUrl.trim()
    ? legacyMini.profileUrl.trim()
    : handle
      ? `https://www.linkedin.com/in/${handle}/`
      : null;
  const urn = String(legacyMini.entityUrn || legacyMini.objectUrn || '').trim();
  const profileId = extractProfileId(urn);
  const distance = typeof legacyMini.distance === 'string' ? legacyMini.distance : '';

  if (!fullName && !handle && !urn) return null;
  return {
    name: fullName,
    headline,
    handle,
    profileUrl,
    urn,
    profileId,
    distance,
    isSelf: isSelfParticipant({ urn, profileId, handle, distance }, self),
  };
}

function isConversationObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const typeStr = String(obj.$type || '');
  const urn = String(obj.entityUrn || obj['$id'] || '');
  const backendUrn = String(obj.backendUrn || '');
  const looksLikeConversation =
    typeStr.includes('messenger.Conversation')
    || typeStr.includes('messaging.Conversation')
    || urn.startsWith('urn:li:msg_conversation:')
    || urn.startsWith('urn:li:fs_conversation:')
    || backendUrn.startsWith('urn:li:messagingThread:');

  if (!looksLikeConversation) return false;

  const hasSubstantiveField =
    'conversationParticipants' in obj
    || '*conversationParticipants' in obj
    || 'participants' in obj
    || '*participants' in obj
    || 'lastActivityAt' in obj
    || 'title' in obj
    || 'messages' in obj
    || '*messages' in obj
    || 'events' in obj
    || '*events' in obj
    || 'categories' in obj;

  return hasSubstantiveField;
}

function isMessageObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const typeStr = String(obj.$type || '');
  const urn = String(obj.entityUrn || obj['$id'] || '');
  const backendUrn = String(obj.backendUrn || '');
  return (
    typeStr.includes('messenger.Message')
    || typeStr.includes('messaging.Event')
    || urn.startsWith('urn:li:msg_message:')
    || urn.startsWith('urn:li:fs_event:')
    || backendUrn.startsWith('urn:li:messagingMessage:')
  );
}

function extractMessageText(obj) {
  const ec = obj.eventContent?.['com.linkedin.voyager.messaging.event.MessageEvent'] || obj.eventContent || {};
  const candidates = [
    unwrapText(obj.body),
    unwrapText(ec.attributedBody),
    unwrapText(ec.body),
    unwrapText(obj.subject),
  ];
  for (const text of candidates) {
    const trimmed = String(text || '').trim();
    if (trimmed) return trimmed;
  }
  if (
    (Array.isArray(obj.renderContent) && obj.renderContent.length > 0)
    || (Array.isArray(obj.attachments) && obj.attachments.length > 0)
    || (Array.isArray(ec.attachments) && ec.attachments.length > 0)
  ) {
    return '[Shared content / attachment]';
  }
  return '';
}

export function parseLinkedInMessagingPayload(payload, selfIdentity = {}) {
  if (!payload || typeof payload !== 'object') {
    return { chats: [], messages: [] };
  }

  const self = normalizeIdentity(selfIdentity);
  const index = indexPayloadObjects(payload);
  const visited = new WeakSet();
  const chatMap = new Map();
  const messageMap = new Map();

  const upsertChat = chat => {
    if (!chat?.threadId) return;
    const prev = chatMap.get(chat.threadId);
    if (!prev) {
      chatMap.set(chat.threadId, chat);
      return;
    }
    chatMap.set(chat.threadId, {
      threadId: chat.threadId,
      conversationUrn:
        (String(chat.conversationUrn || '').startsWith('urn:li:msg_conversation:') ? chat.conversationUrn : null)
        || (String(prev.conversationUrn || '').startsWith('urn:li:msg_conversation:') ? prev.conversationUrn : null)
        || chat.conversationUrn
        || prev.conversationUrn
        || chat.threadId,
      name: (chat.name && chat.name !== 'LinkedIn Conversation' ? chat.name : null) || prev.name || 'LinkedIn Conversation',
      headline: chat.headline || prev.headline || '',
      handle: chat.handle || prev.handle || null,
      profileUrl: chat.profileUrl || prev.profileUrl || null,
      preview: chat.timestamp >= prev.timestamp ? (chat.preview || prev.preview || '') : (prev.preview || chat.preview || ''),
      timestamp: Math.max(chat.timestamp || 0, prev.timestamp || 0),
    });
  };

  const collectConversation = conv => {
    const convUrn = String(conv.entityUrn || conv['$id'] || conv.backendUrn || '').trim();
    const threadId = extractThreadId(convUrn) || extractThreadId(conv.backendUrn);
    if (!threadId) return null;

    const rawParticipants =
      conv.conversationParticipants
      || conv['*conversationParticipants']
      || conv.participants
      || conv['*participants']
      || [];

    const others = [];
    for (const ref of Array.isArray(rawParticipants) ? rawParticipants : []) {
      const info = extractParticipantInfo(index, ref, self);
      if (!info || info.isSelf) continue;
      if (info.name || info.handle || info.urn) others.push(info);
    }

    const explicitTitle = unwrapText(conv.title).trim();
    const joinedNames = others.map(p => p.name).filter(Boolean).join(', ');
    const primary = others[0] || {};
    const name = explicitTitle || joinedNames || primary.handle || 'LinkedIn Conversation';
    const headline = others.length <= 1 ? (primary.headline || '') : '';
    const handle = others.length <= 1 ? (primary.handle || null) : null;
    const profileUrl = others.length <= 1 ? (primary.profileUrl || null) : null;

    let timestamp = toUnixSeconds(conv.lastActivityAt || conv.lastReadAt || 0);
    let preview = '';

    const inlineNodes = [
      ...(Array.isArray(conv.messages?.elements) ? conv.messages.elements : Array.isArray(conv.messages) ? conv.messages : []),
      ...(Array.isArray(conv['*messages']) ? conv['*messages'] : []),
      ...(Array.isArray(conv.events) ? conv.events : []),
      ...(Array.isArray(conv['*events']) ? conv['*events'] : []),
    ];
    for (const evRef of inlineNodes) {
      const ev = resolveRef(index, evRef) || evRef;
      if (!ev || typeof ev !== 'object') continue;
      if (isMessageObject(ev)) {
        collectMessage(ev, convUrn || threadId);
      }
      const evText = extractMessageText(ev);
      const evTs = toUnixSeconds(ev.deliveredAt || ev.createdAt || 0);
      if (evText && evTs >= timestamp) {
        preview = evText.slice(0, 180);
      } else if (evText && !preview) {
        preview = evText.slice(0, 180);
      }
      if (evTs > timestamp) timestamp = evTs;
    }

    upsertChat({
      threadId,
      conversationUrn: convUrn || threadId,
      name,
      headline,
      handle,
      profileUrl,
      preview,
      timestamp: timestamp || Math.floor(Date.now() / 1000),
    });

    return convUrn || threadId;
  };

  const collectMessage = (msg, enclosingConversationUrn) => {
    const text = extractMessageText(msg);
    if (!text) return;

    const rawConvRef =
      msg.conversationUrn
      || msg['*conversation']
      || (typeof msg.conversation === 'string'
        ? msg.conversation
        : msg.conversation?.entityUrn || msg.conversation?.['$id'] || msg.conversation?.backendUrn)
      || msg.backendConversationUrn
      || enclosingConversationUrn
      || '';

    const resolvedConv = resolveRef(index, rawConvRef);
    const convUrn = String(
      resolvedConv?.entityUrn
      || resolvedConv?.backendUrn
      || (typeof rawConvRef === 'string' ? rawConvRef : ''),
    ).trim();
    const threadId = extractThreadId(convUrn);
    if (!threadId) return;

    const rawSender =
      msg.sender
      || msg['*sender']
      || msg.actor
      || msg['*actor']
      || msg.from
      || msg['*from']
      || null;
    const senderInfo = rawSender ? extractParticipantInfo(index, rawSender, self) : null;
    const fromMe = Boolean(senderInfo?.isSelf);
    const ts = toUnixSeconds(msg.deliveredAt || msg.createdAt || Date.now());
    const rawMsgUrn = msg.entityUrn || msg['$id'] || msg.backendUrn || '';
    const messageId = extractThreadId(rawMsgUrn) || `${threadId}-${ts}-${text.slice(0, 16)}`;
    if (!messageId) return;

    const key = `${threadId}:${messageId}`;
    messageMap.set(key, {
      threadId,
      messageId,
      text: text.slice(0, 16000),
      fromMe,
      senderName: senderInfo?.name || (fromMe ? self.profileName || 'You' : ''),
      timestamp: ts || Math.floor(Date.now() / 1000),
      status: 3,
    });
  };

  const walk = (node, enclosingConversationUrn = '') => {
    if (!node || typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item, enclosingConversationUrn);
      return;
    }

    let nextConvUrn = enclosingConversationUrn;
    if (isConversationObject(node)) {
      const capturedUrn = collectConversation(node);
      if (capturedUrn) nextConvUrn = capturedUrn;
    }
    if (isMessageObject(node)) {
      collectMessage(node, nextConvUrn);
    }

    for (const [key, val] of Object.entries(node)) {
      if (!val || typeof val !== 'object') continue;
      const nestedUrn =
        key === 'messages' || key === '*messages' || key === 'events' || key === '*events'
          ? nextConvUrn
          : enclosingConversationUrn;
      walk(val, nestedUrn);
    }
  };

  walk(payload, '');

  // Ensure chats receive latest preview & timestamp from parsed messages
  for (const msg of messageMap.values()) {
    const chat = chatMap.get(msg.threadId);
    if (!chat) continue;
    if (!msg.senderName && !msg.fromMe && chat.name && chat.name !== 'LinkedIn Conversation') {
      msg.senderName = chat.name;
    }
    if (!chat.preview || msg.timestamp >= chat.timestamp) {
      chat.preview = msg.text.slice(0, 180);
    }
    if (msg.timestamp > chat.timestamp) {
      chat.timestamp = msg.timestamp;
    }
  }

  const chats = [...chatMap.values()].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const messages = [...messageMap.values()].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  return { chats, messages };
}
