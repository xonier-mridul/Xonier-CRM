import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { isSessionOwnerActive } from '../src/session_access.mjs';

test('session access requires a live company and an active owner who still belongs to it', async () => {
  const company = { _id: new ObjectId(), status: 'active', deletedAt: null };
  const user = { _id: new ObjectId(), companyId: company._id, status: 'active', deletedAt: null };
  const sid = `${company._id}:${user._id}`;
  const rows = { users: user, companies: company };
  const db = { collection: name => ({
    findOne: async (filter, options) => {
      assert.equal(options.readPreference, 'primary');
      const row = rows[name];
      return row && Object.entries(filter).every(([key, value]) => (
        value instanceof ObjectId ? value.equals(row[key]) : value === row[key]
      )) ? row : null;
    },
  }) };

  assert.equal(await isSessionOwnerActive(db, sid), true);
  user.status = 'inactive';
  assert.equal(await isSessionOwnerActive(db, sid), false);
  user.status = 'active';
  user.companyId = new ObjectId();
  assert.equal(await isSessionOwnerActive(db, sid), false);
  user.companyId = company._id;
  company.status = 'suspended';
  assert.equal(await isSessionOwnerActive(db, sid), false);
  company.status = 'active';
  user.deletedAt = new Date();
  assert.equal(await isSessionOwnerActive(db, sid), false);
});
