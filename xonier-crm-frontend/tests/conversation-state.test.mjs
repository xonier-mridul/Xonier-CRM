import test from "node:test";
import assert from "node:assert/strict";
import { mergeConversation, applyConversationMessage } from "../src/components/chat/conversationState.ts";

const room = (values = {}) => ({ id: "room", kind: "group", name: "Team", description: "", visibility: "private",
  ownerId: "alice", memberIds: ["alice", "bob"], memberNames: {}, lastSeq: 4, settingsVersion: 1,
  read: { alice: 4 }, unread: 0, updatedAt: "2026-10-23T10:00:00Z",
  lastMessage: { text: "Original", senderName: "Bob", seq: 4, version: 1 }, ...values });
const message = (values = {}) => ({ id: "msg", clientId: "stable", conversationId: "room", senderId: "bob",
  senderName: "Bob", seq: 5, version: 1, parentId: null, text: "New", createdAt: "2026-10-23T10:01:00Z", ...values });

test("HTTP and socket acknowledgements never double unread counts", () => {
  let items = applyConversationMessage([room()], message(), true, "alice");
  assert.equal(items[0].unread, 1);
  items = applyConversationMessage(items, message(), true, "alice");
  assert.equal(items[0].unread, 1);
});
test("thread replies advance conversation sequence without replacing main-message preview or unread", () => {
  const original = room();
  const updated = applyConversationMessage([original], message({ parentId: "parent" }), true, "alice")[0];
  assert.equal(updated.lastSeq, 5);
  assert.equal(updated.lastMessage.text, "Original");
  assert.equal(updated.unread, 0);
});
test("stale refresh cannot undo a local read acknowledgement", () => {
  const current = room({ lastSeq: 5, read: { alice: 5 } });
  const incoming = room({ lastSeq: 5, read: { alice: 3 }, unread: 2 });
  const merged = mergeConversation(current, incoming, "alice");
  assert.equal(merged.read.alice, 5);
  assert.equal(merged.unread, 0);
});
test("new settings and newer message data merge independently", () => {
  const current = room({ lastSeq: 8, lastMessage: { seq: 8, text: "Latest" } });
  const snapshot = room({ name: "Renamed", settingsVersion: 2 });
  const merged = mergeConversation(current, snapshot, "alice");
  assert.equal(merged.name, "Renamed");
  assert.equal(merged.lastSeq, 8);
  assert.equal(merged.lastMessage.text, "Latest");
});
test("late edit events cannot resurrect a deleted sidebar preview", () => {
  let items = applyConversationMessage([room()], message({ deletedAt: "2026-10-23T10:02:00Z", version: 3 }), true, "alice");
  items = applyConversationMessage(items, message({ version: 2, text: "Stale edit" }), false, "alice");
  assert.equal(items[0].lastMessage.text, "Message deleted");
});
test("an older HTTP snapshot at the same sequence cannot erase a newer preview version", () => {
  const current = room({ lastMessage: { seq: 4, text: "Message deleted", version: 3 } });
  const merged = mergeConversation(current, room(), "alice");
  assert.equal(merged.lastMessage.text, "Message deleted");
});
