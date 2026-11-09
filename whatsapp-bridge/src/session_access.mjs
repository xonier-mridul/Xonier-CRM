import { ObjectId } from 'mongodb';

export async function isSessionOwnerActive(db, sid) {
  const [company, owner] = sid.split(':').map(id => new ObjectId(id));
  const [user, account] = await Promise.all([
    db.collection('users').findOne(
      { _id: owner, companyId: company, status: 'active', deletedAt: null },
      { projection: { _id: 1 }, readPreference: 'primary' },
    ),
    db.collection('companies').findOne(
      { _id: company, status: 'active', deletedAt: null },
      { projection: { _id: 1 }, readPreference: 'primary' },
    ),
  ]);
  return Boolean(user && account);
}
