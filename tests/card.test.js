import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveValue, availableFields, buildCard, pickBusiness, sortedBusinesses, longestFields, PERSONAL_CARD } from '../js/core/card.js';

const me = {
  firstName: 'Jane', lastName: 'Doe', photo: 'data:image/jpeg;base64,AAA',
  mobile: '082 123 4567', workPhone: '', email: 'jane@home.com', website: '', address: '1 Main Rd', social: '',
};
const biz = {
  id: 'b1', name: 'Acme', logo: 'data:image/png;base64,BBB', title: 'Owner',
  overrides: { email: 'jane@acme.com', address: '   ' },
  defaultFields: ['title', 'mobile', 'email', 'website', 'address'], order: 0,
};

test('a business override wins over the personal value', () => {
  assert.equal(effectiveValue(me, biz, 'email'), 'jane@acme.com');
});

test('a blank override falls back to the personal value', () => {
  assert.equal(effectiveValue(me, biz, 'address'), '1 Main Rd');
});

test('title comes from the business', () => {
  assert.equal(effectiveValue(me, biz, 'title'), 'Owner');
});

test('availableFields lists default fields that have a value, in display order', () => {
  assert.deepEqual(availableFields(me, biz).map(f => f.key), ['title', 'mobile', 'email', 'address']);
  assert.equal(availableFields(me, biz)[1].label, 'Mobile');
});

test('buildCard leaves out hidden fields and keeps name, business and images', () => {
  assert.deepEqual(buildCard(me, biz, new Set(['mobile'])), {
    firstName: 'Jane', lastName: 'Doe', org: 'Acme', photo: me.photo, logo: biz.logo,
    title: 'Owner', email: 'jane@acme.com', address: '1 Main Rd',
  });
});

test('buildCard never includes a field the business does not share', () => {
  assert.equal(buildCard({ ...me, workPhone: '011 555' }, biz).workPhone, undefined);
});

test('pickBusiness returns the last used business', () => {
  const list = [{ id: 'x', order: 0 }, { id: 'y', order: 1 }];
  assert.equal(pickBusiness(list, 'y').id, 'y');
});

test('pickBusiness falls back to the first business when the last one is gone', () => {
  const list = [{ id: 'x', order: 1 }, { id: 'y', order: 0 }];
  assert.equal(pickBusiness(list, 'deleted').id, 'y');
});

test('pickBusiness returns null when there are no businesses', () => {
  assert.equal(pickBusiness([], 'x'), null);
});

test('sortedBusinesses does not change the original list', () => {
  const list = [{ id: 'a', order: 2 }, { id: 'b', order: 1 }];
  assert.deepEqual(sortedBusinesses(list).map(b => b.id), ['b', 'a']);
  assert.equal(list[0].id, 'a');
});

test('longestFields names the longest shared fields', () => {
  assert.deepEqual(longestFields({ title: 'CEO', address: 'A very long street address 123', email: 'a@b.co' }), ['Address', 'Email']);
});

test('a personal card (no business) shares the personal details with no business name', async () => {
  const { buildVCard } = await import('../js/core/vcard.js');
  const card = buildCard(me, PERSONAL_CARD);
  assert.equal(card.mobile, '082 123 4567');
  assert.equal(card.email, 'jane@home.com');
  assert.ok(!buildVCard(card).includes('ORG:'));
});
