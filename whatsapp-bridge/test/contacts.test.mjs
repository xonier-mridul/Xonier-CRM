import test from 'node:test';
import assert from 'node:assert/strict';
import { displayContact, phoneFromJid, mergeChatAliases } from '../src/contacts.mjs';
test('internal LID is never treated as a phone number', () => {
  assert.equal(phoneFromJid('136876413452382@lid'), null);
  assert.equal(displayContact({jid:'136876413452382@lid',name:'136876413452382'}).name, 'Contact syncing…');
});
test('saved phone name wins; unsaved contacts show the mapped international number', () => {
  const chat={jid:'136876413452382@lid',name:'136876413452382'};
  assert.equal(displayContact(chat,{name:'Mummy ❤️',phoneNumber:'919876543210@s.whatsapp.net'}).name,'Mummy ❤️');
  assert.equal(displayContact(chat,{notify:'Some profile',phoneNumber:'919876543210@s.whatsapp.net'}).name,'+919876543210');
  assert.equal(displayContact({jid:'447700900123@s.whatsapp.net'}).name,'+447700900123');
});
test('groups retain their subject; numeric group ids are hidden', () => {
  assert.equal(displayContact({jid:'120000@g.us',name:'Sales Team'}).name,'Sales Team');
  assert.equal(displayContact({jid:'120000@g.us',name:'120000'}).name,'WhatsApp group');
});

test('contact names survive history mapping order, update across aliases and stay session scoped', async () => {
  const { ContactDirectory } = await import('../src/contacts.mjs');
  const records = [];
  const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(clause => matches(row, clause));
    return value?.$in ? value.$in.includes(row[key]) : row[key] === value;
  });
  const collection = {
    find: filter => ({ toArray: async () => records.filter(row => matches(row, filter)).map(row => ({...row})) }),
    updateOne: async (filter, update) => {
      let row=records.find(row=>matches(row,filter));
      if(!row){ row={...update.$setOnInsert};records.push(row); }
      Object.assign(row,update.$set);
    },
  };
  const directory = new ContactDirectory(collection);
  const lid='123456789012345@lid', pn='919876543210@s.whatsapp.net';
  await directory.absorb('one',[{id:pn,name:'Saved name'}]);
  const beforeRead = structuredClone(records);
  const recovered = new Map([[lid, pn]]);
  assert.equal((await directory.decorate('one', [{jid:lid}], recovered))[0].name, 'Saved name');
  assert.equal((await directory.decorate('two', [{jid:lid}], recovered))[0].name, '+919876543210');
  assert.deepEqual(records, beforeRead);
  await directory.map('one',[{lid,pn}]);
  assert.equal((await directory.decorate('one',[{jid:lid}]))[0].name,'Saved name');
  await directory.absorb('one',[{id:pn,name:'Updated name'}]);
  assert.equal((await directory.decorate('one',[{jid:lid}]))[0].name,'Updated name');
  await directory.absorb('one',[{id:lid,notify:'Profile only'}]);
  assert.equal((await directory.decorate('one',[{jid:lid}]))[0].name,'Updated name');
  await directory.absorb('one',[{id:lid,name:undefined}]);
  assert.equal((await directory.decorate('one',[{jid:lid}]))[0].name,'Updated name');
  assert.equal((await directory.decorate('two',[{jid:lid}]))[0].name,'Contact syncing…');
});


test('PN and LID chats become one conversation with latest preview; equal names never merge different numbers', () => {
  const rows = mergeChatAliases([
    {jid:'123@lid',phone:'+919876543210',name:'Darpan',timestamp:10,preview:'old'},
    {jid:'919876543210@s.whatsapp.net',phone:'+919876543210',name:'Darpan',timestamp:20,preview:'latest'},
    {jid:'919876543211@s.whatsapp.net',phone:'+919876543211',name:'Darpan',timestamp:15},
    {jid:'456@lid',phone:null,name:'Contact syncing…',timestamp:5},
    {jid:'789@lid',phone:null,name:'Contact syncing…',timestamp:4},
  ]);
  assert.equal(rows.length,4);
  assert.equal(rows[0].jid,'919876543210@s.whatsapp.net');
  assert.equal(rows[0].preview,'latest');
});
