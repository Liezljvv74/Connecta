// Works out exactly which details are shared for a business (spec §4.1).
import { SHAREABLE, LABELS } from './model.js';

const clean = v => (typeof v === 'string' ? v.trim() : '');

export function effectiveValue(me, biz, key) {
  if (key === 'title') return clean(biz.title);
  return clean(biz.overrides?.[key]) || clean(me[key]);
}

// Fields this business shares by default that actually have a value.
export function availableFields(me, biz) {
  return SHAREABLE
    .filter(key => biz.defaultFields.includes(key))
    .map(key => ({ key, label: LABELS[key], value: effectiveValue(me, biz, key) }))
    .filter(f => f.value);
}

export function buildCard(me, biz, hidden = new Set()) {
  const card = {
    firstName: clean(me.firstName),
    lastName: clean(me.lastName),
    org: clean(biz.name),
    photo: me.photo || '',
    logo: biz.logo || '',
  };
  for (const f of availableFields(me, biz)) if (!hidden.has(f.key)) card[f.key] = f.value;
  return card;
}

export const sortedBusinesses = list => [...list].sort((a, b) => a.order - b.order);

export function pickBusiness(businesses, lastId) {
  return businesses.find(b => b.id === lastId) ?? sortedBusinesses(businesses)[0] ?? null;
}

// The longest shared fields, to suggest what to switch off when the QR code is too full.
export function longestFields(card, count = 2) {
  return SHAREABLE
    .filter(k => card[k])
    .sort((a, b) => card[b].length - card[a].length)
    .slice(0, count)
    .map(k => LABELS[k]);
}
