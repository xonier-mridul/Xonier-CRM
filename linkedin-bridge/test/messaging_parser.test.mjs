import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMessagesGraphqlUrl,
  encodeRestliValue,
  extractProfileId,
  extractThreadId,
  parseLinkedInMessagingPayload,
} from '../src/messaging_parser.mjs';

test('parses modern nested messengerConversationsBySyncToken payload with AttributedText, base64 threadId, and fs_miniProfile -> fsd_profile self matching', () => {
  const threadId = '2-YzE4M2I5YzEtMTIzNC00YWJjLTg5ZWYtMDAxMTIyMzM0NDU1XzAxMg==';
  const convUrn = `urn:li:msg_conversation:(urn:li:fsd_profile:ACoAASELF,${threadId})`;

  const payload = {
    data: {
      messengerConversationsBySyncToken: {
        elements: [
          {
            $type: 'com.linkedin.messenger.Conversation',
            entityUrn: convUrn,
            backendUrn: `urn:li:messagingThread:${threadId}`,
            lastActivityAt: 1763541200000,
            conversationParticipants: [
              {
                $type: 'com.linkedin.messenger.MessagingParticipant',
                hostIdentityUrn: 'urn:li:fsd_profile:ACoAASELF',
                participantType: {
                  member: {
                    firstName: { text: 'Darpan' },
                    lastName: { text: 'Sharma' },
                    headline: { text: 'AI Researcher' },
                    profileUrl: 'https://www.linkedin.com/in/darpan-sharma-60867222b/',
                    distance: 'SELF',
                  },
                },
              },
              {
                $type: 'com.linkedin.messenger.MessagingParticipant',
                hostIdentityUrn: 'urn:li:fsd_profile:ACoAAOTHER',
                participantType: {
                  member: {
                    firstName: { text: 'Riya' },
                    lastName: { text: 'Verma' },
                    headline: { text: 'Talent Partner at Acme' },
                    profileUrl: 'https://www.linkedin.com/in/riya-verma-123/',
                    distance: 'DISTANCE_1',
                  },
                },
              },
            ],
            messages: {
              elements: [
                {
                  $type: 'com.linkedin.messenger.Message',
                  entityUrn: `urn:li:msg_message:(urn:li:fsd_profile:ACoAASELF,2-msg-in)`,
                  body: { text: 'Hi Darpan, are you available this week?' },
                  deliveredAt: 1763541100000,
                  sender: {
                    hostIdentityUrn: 'urn:li:fsd_profile:ACoAAOTHER',
                    participantType: {
                      member: {
                        firstName: { text: 'Riya' },
                        lastName: { text: 'Verma' },
                        profileUrl: 'https://www.linkedin.com/in/riya-verma-123/',
                      },
                    },
                  },
                },
                {
                  $type: 'com.linkedin.messenger.Message',
                  entityUrn: `urn:li:msg_message:(urn:li:fsd_profile:ACoAASELF,2-msg-out)`,
                  body: { text: 'Yes, let us connect tomorrow!' },
                  deliveredAt: 1763541200000,
                  sender: {
                    hostIdentityUrn: 'urn:li:fsd_profile:ACoAASELF',
                    participantType: {
                      member: {
                        firstName: { text: 'Darpan' },
                        lastName: { text: 'Sharma' },
                        profileUrl: 'https://www.linkedin.com/in/darpan-sharma-60867222b/',
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };

  const result = parseLinkedInMessagingPayload(payload, {
    memberUrn: 'urn:li:fs_miniProfile:ACoAASELF',
    handle: 'darpan-sharma-60867222b',
    profileName: 'Darpan Sharma',
  });

  assert.equal(result.chats.length, 1);
  assert.equal(result.chats[0].threadId, threadId);
  assert.equal(result.chats[0].conversationUrn, convUrn);
  assert.equal(result.chats[0].name, 'Riya Verma');
  assert.equal(result.chats[0].headline, 'Talent Partner at Acme');
  assert.equal(result.chats[0].handle, 'riya-verma-123');
  assert.equal(result.chats[0].preview, 'Yes, let us connect tomorrow!');
  assert.equal(result.chats[0].timestamp, 1763541200);

  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].threadId, threadId);
  assert.equal(result.messages[0].fromMe, false);
  assert.equal(result.messages[0].senderName, 'Riya Verma');
  assert.equal(result.messages[1].fromMe, true);
  assert.equal(result.messages[1].messageId, '2-msg-out');
});

test('parses modern normalized voyagerMessagingGraphQL payload via included[] and pointer keys', () => {
  const convUrn = 'urn:li:msg_conversation:(urn:li:fsd_profile:ACoAASELF,2-norm-thread=)';
  const pSelfUrn = 'urn:li:msg_messagingParticipant:(urn:li:fsd_profile:ACoAASELF,1)';
  const pOtherUrn = 'urn:li:msg_messagingParticipant:(urn:li:fsd_profile:ACoAAOTHER2,2)';
  const msgUrn = 'urn:li:msg_message:(urn:li:fsd_profile:ACoAASELF,2-norm-msg-1)';

  const payload = {
    data: {
      data: {
        messengerConversationsByCategoryQuery: {
          '*elements': [convUrn],
        },
      },
    },
    included: [
      {
        $type: 'com.linkedin.messenger.MessagingParticipant',
        entityUrn: pSelfUrn,
        hostIdentityUrn: 'urn:li:fsd_profile:ACoAASELF',
        participantType: {
          member: {
            firstName: 'Darpan',
            lastName: 'Sharma',
            profileUrl: 'https://www.linkedin.com/in/darpan-sharma/',
          },
        },
      },
      {
        $type: 'com.linkedin.messenger.MessagingParticipant',
        entityUrn: pOtherUrn,
        hostIdentityUrn: 'urn:li:fsd_profile:ACoAAOTHER2',
        participantType: {
          member: {
            firstName: 'Ananya',
            lastName: 'Kapoor',
            headline: 'Product Lead',
            profileUrl: 'https://www.linkedin.com/in/ananya-kapoor/',
          },
        },
      },
      {
        $type: 'com.linkedin.messenger.Conversation',
        entityUrn: convUrn,
        lastActivityAt: 1763542000000,
        '*conversationParticipants': [pSelfUrn, pOtherUrn],
        '*messages': [msgUrn],
      },
      {
        $type: 'com.linkedin.messenger.Message',
        entityUrn: msgUrn,
        body: { text: 'Following up on the CRM demo.' },
        deliveredAt: 1763542000000,
        '*sender': pOtherUrn,
        conversation: { entityUrn: convUrn },
      },
    ],
  };

  const result = parseLinkedInMessagingPayload(payload, {
    memberUrn: 'urn:li:fs_miniProfile:ACoAASELF',
  });

  assert.equal(result.chats.length, 1);
  assert.equal(result.chats[0].threadId, '2-norm-thread=');
  assert.equal(result.chats[0].name, 'Ananya Kapoor');
  assert.equal(result.chats[0].headline, 'Product Lead');
  assert.equal(result.chats[0].handle, 'ananya-kapoor');
  assert.equal(result.chats[0].preview, 'Following up on the CRM demo.');
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].fromMe, false);
  assert.equal(result.messages[0].messageId, '2-norm-msg-1');
});

test('does not emit a fake chat from a stub conversation pointer inside standalone messengerMessages', () => {
  const threadId = '2-standalone-thread==';
  const convUrn = `urn:li:msg_conversation:(urn:li:fsd_profile:ACoAASELF,${threadId})`;

  const payload = {
    data: {
      messengerMessagesByAnchorTimestamp: {
        elements: [
          {
            $type: 'com.linkedin.messenger.Message',
            entityUrn: 'urn:li:msg_message:(urn:li:fsd_profile:ACoAASELF,2-m1)',
            body: { text: 'Hello from standalone query' },
            deliveredAt: 1763543000000,
            conversation: {
              entityUrn: convUrn,
            },
            sender: {
              hostIdentityUrn: 'urn:li:fsd_profile:ACoAASELF',
              participantType: {
                member: {
                  firstName: { text: 'Darpan' },
                  lastName: { text: 'Sharma' },
                },
              },
            },
          },
        ],
      },
    },
  };

  const result = parseLinkedInMessagingPayload(payload, {
    memberUrn: 'urn:li:fsd_profile:ACoAASELF',
  });

  assert.equal(result.chats.length, 0);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].threadId, threadId);
  assert.equal(result.messages[0].messageId, '2-m1');
  assert.equal(result.messages[0].fromMe, true);
});

test('parses legacy LEGACY_INBOX fs_conversation and MessageEvent payload', () => {
  const payload = {
    data: {
      elements: ['urn:li:fs_conversation:legacy-thread-99'],
    },
    included: [
      {
        $type: 'com.linkedin.voyager.identity.shared.MiniProfile',
        entityUrn: 'urn:li:fs_miniProfile:ACoAASELF',
        firstName: 'Darpan',
        lastName: 'Sharma',
        publicIdentifier: 'darpan-sharma',
      },
      {
        $type: 'com.linkedin.voyager.identity.shared.MiniProfile',
        entityUrn: 'urn:li:fs_miniProfile:ACoAALEGACY',
        firstName: 'Vikram',
        lastName: 'Mehta',
        occupation: 'Founder',
        publicIdentifier: 'vikram-mehta',
      },
      {
        $type: 'com.linkedin.voyager.messaging.Conversation',
        entityUrn: 'urn:li:fs_conversation:legacy-thread-99',
        lastActivityAt: 1763544000000,
        '*participants': [
          { '*miniProfile': 'urn:li:fs_miniProfile:ACoAASELF' },
          { '*miniProfile': 'urn:li:fs_miniProfile:ACoAALEGACY' },
        ],
        '*events': ['urn:li:fs_event:(legacy-thread-99,evt-1)'],
      },
      {
        $type: 'com.linkedin.voyager.messaging.event.MessageEvent',
        entityUrn: 'urn:li:fs_event:(legacy-thread-99,evt-1)',
        createdAt: 1763544000000,
        '*from': { '*miniProfile': 'urn:li:fs_miniProfile:ACoAALEGACY' },
        eventContent: {
          'com.linkedin.voyager.messaging.event.MessageEvent': {
            attributedBody: { text: 'Legacy inbox still works!' },
          },
        },
      },
    ],
  };

  const result = parseLinkedInMessagingPayload(payload, {
    memberUrn: 'urn:li:fs_miniProfile:ACoAASELF',
    handle: 'darpan-sharma',
  });

  assert.equal(result.chats.length, 1);
  assert.equal(result.chats[0].threadId, 'legacy-thread-99');
  assert.equal(result.chats[0].name, 'Vikram Mehta');
  assert.equal(result.chats[0].headline, 'Founder');
  assert.equal(result.chats[0].preview, 'Legacy inbox still works!');
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].threadId, 'legacy-thread-99');
  assert.equal(result.messages[0].messageId, 'evt-1');
  assert.equal(result.messages[0].fromMe, false);
});

test('encodeRestliValue encodes parentheses cleanly and buildMessagesGraphqlUrl avoids syncToken-only delta queries', () => {
  const convUrn = 'urn:li:msg_conversation:(urn:li:fsd_profile:ACoAA1,2-NzU1OGE3OTgtMTIzNA==)';
  const encoded = encodeRestliValue(convUrn);
  assert.ok(!encoded.includes('(') && !encoded.includes(')'), 'parentheses must be percent-encoded');
  assert.ok(encoded.includes('%28') && encoded.includes('%29'));

  const deltaOnlyUrl = buildMessagesGraphqlUrl(
    {
      messagesUrl: 'https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?variables=(syncToken:abc)&queryId=messengerMessages.old1',
      messagesQueryId: 'messengerMessages.fresh99',
    },
    convUrn,
  );
  assert.equal(
    deltaOnlyUrl,
    `/voyager/api/voyagerMessagingGraphQL/graphql?variables=(conversationUrn:${encoded})&queryId=messengerMessages.fresh99`,
  );

  const reusedAnchorUrl = buildMessagesGraphqlUrl(
    {
      messagesUrl: 'https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?variables=(deliveredAt:1700000000000,conversationUrn:OLD_URN,countBefore:20)&queryId=messengerMessages.anchor',
      messagesQueryId: 'messengerMessages.anchor',
    },
    convUrn,
  );
  assert.ok(reusedAnchorUrl.startsWith('/voyager/api/voyagerMessagingGraphQL/graphql?'));
  assert.ok(reusedAnchorUrl.includes(`conversationUrn:${encoded}`));
  assert.ok(!reusedAnchorUrl.includes('deliveredAt:1700000000000'));
  assert.equal(extractProfileId('urn:li:fs_miniProfile:ACoAAXYZ'), 'ACoAAXYZ');
});

test('extractThreadId preserves base64 padding characters (= and ==)', () => {
  const padded = '2-NzU1OGE3OTgtZmU5ZC00YmYxLWI0MzYtZjllYTdlNmU0ZTE1XzAxMg==';
  assert.equal(extractThreadId(`urn:li:msg_conversation:(urn:li:fsd_profile:ACoAA,${padded})`), padded);
  assert.equal(/^[0-9A-Za-z_.:(),~=-]+$/.test(padded), true);
});
