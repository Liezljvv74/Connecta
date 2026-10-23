import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeName, currentPlace } from '../js/core/place.js';

test('a named venue with its town', () => {
  assert.equal(placeName({ name: 'Hermanus Golf Club', address: { road: 'Main Road', town: 'Hermanus' } }), 'Hermanus Golf Club, Hermanus');
});

test('no venue: street and number with the town', () => {
  assert.equal(placeName({ name: 'Stormvoël Crescent', address: { house_number: '54', road: 'Stormvoël Crescent', suburb: 'Vermont', town: 'Hermanus' } }),
    '54 Stormvoël Crescent, Hermanus');
});

test('town, then village, then city, then suburb are used for the town', () => {
  assert.equal(placeName({ address: { road: 'Long Street', city: 'Cape Town', suburb: 'CBD' } }), 'Long Street, Cape Town');
  assert.equal(placeName({ address: { road: 'Raed Na Gael Street', suburb: 'Mosselrivier', town: 'Hermanus', city: 'Overstrand Local Municipality' } }),
    'Raed Na Gael Street, Hermanus');
  assert.equal(placeName({ address: { village: 'Onrus' } }), 'Onrus');
  assert.equal(placeName({}), '');
});

const geoAt = (latitude, longitude) => ({ getCurrentPosition: ok => ok({ coords: { latitude, longitude } }) });

test('looks up the place once, and reuses it while you stay within about 150 m', async () => {
  const asked = [];
  const fetchFn = async url => { asked.push(url); return { ok: true, json: async () => ({ name: 'Venue', address: { town: 'Hermanus' } }) }; };
  assert.equal(await currentPlace({ geo: geoAt(-34.4187, 19.2345), fetchFn }), 'Venue, Hermanus');
  assert.match(asked[0], /^https:\/\/nominatim\.openstreetmap\.org\/reverse\?format=jsonv2&lat=-34\.41870&lon=19\.23450&/);
  assert.equal(await currentPlace({ geo: geoAt(-34.4190, 19.2350), fetchFn }), 'Venue, Hermanus'); // ~60 m away
  assert.equal(asked.length, 1);
  await currentPlace({ geo: geoAt(-34.4300, 19.2345), fetchFn }); // ~1.3 km away
  assert.equal(asked.length, 2);
});

test('no permission, no signal or no answer gives an empty place', async () => {
  const denied = { getCurrentPosition: (ok, fail) => fail(new Error('denied')) };
  assert.equal(await currentPlace({ geo: denied, fetchFn: async () => ({ ok: true, json: async () => ({}) }) }), '');
  assert.equal(await currentPlace({ geo: geoAt(10, 10), fetchFn: async () => { throw new Error('offline'); } }), '');
  assert.equal(await currentPlace({ geo: geoAt(20, 20), fetchFn: async () => ({ ok: false }) }), '');
  assert.equal(await currentPlace({ geo: undefined }), '');
});

test('a lookup that is still running is shared, not repeated', async () => {
  let calls = 0;
  const fetchFn = async () => { calls++; return { ok: true, json: async () => ({ name: 'Expo Hall', address: { city: 'Durban' } }) }; };
  const slowGeo = { getCurrentPosition: ok => setTimeout(() => ok({ coords: { latitude: -29.85, longitude: 31.02 } }), 20) };
  const [a, b] = await Promise.all([currentPlace({ geo: slowGeo, fetchFn }), currentPlace({ geo: slowGeo, fetchFn })]);
  assert.equal(a, 'Expo Hall, Durban');
  assert.equal(b, 'Expo Hall, Durban');
  assert.equal(calls, 1);
});
