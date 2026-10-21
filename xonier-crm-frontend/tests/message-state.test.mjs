import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessages } from "../src/components/chat/messageState.ts";

const message = (values = {}) => ({ id: "server-id", clientId: "stable-id", senderId: "alice", conversationId: "room",
  text: "hello", parentId: null, attachments: [], seq: 4, version: 1, reactions: {}, replyCount: 0,
  createdAt: "2026-10-20T10:00:00.000Z", editedAt: null, deletedAt: null, ...values });

test("socket and HTTP acknowledgements replace one optimistic send without duplicates", () => {
  const optimistic = message({ id: "stable-id", seq: 0, delivery: "sending" });
  const acknowledged = message();
  const result = mergeMessages(mergeMessages([optimistic], [acknowledged]), [acknowledged, optimistic]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "server-id");
  assert.equal(result[0].delivery, undefined);
});
test("stale events cannot resurrect deleted messages or erase edits", () => {
  const tombstone = message({ version: 3, text: "", deletedAt: "2026-10-20T10:01:00Z" });
  assert.deepEqual(mergeMessages([tombstone], [message({ version: 2, text: "edited" })]), [tombstone]);
});
test("same client UUID from different senders is not deduplicated", () => {
  assert.equal(mergeMessages([message()], [message({ senderId: "bob" })]).length, 2);
});
test("confirmed sequence order precedes pending drafts and does not mutate inputs", () => {
  const current = [message({ seq: 0, delivery: "failed" })];
  const incoming = [message({ clientId: "other", seq: 2 }), message({ clientId: "third", seq: 1 })];
  assert.deepEqual(mergeMessages(current, incoming).map(item => item.seq), [1, 2, 0]);
  assert.equal(current[0].delivery, "failed");
  assert.equal(incoming[0].seq, 2);
});
