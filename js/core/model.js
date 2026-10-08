// Field definitions and the shape of everything Connecta stores.

export const SCHEMA_VERSION = 1;

export const PERSONAL_FIELDS = ['firstName', 'lastName', 'photo', 'mobile', 'workPhone', 'email', 'website', 'address', 'social'];

// Fields that can be switched on/off when sharing, in display order.
export const SHAREABLE = ['title', 'mobile', 'workPhone', 'email', 'website', 'address', 'social'];

// Personal fields a business can replace with its own value.
export const OVERRIDABLE = ['mobile', 'workPhone', 'email', 'website', 'address', 'social'];

export const LABELS = {
  firstName: 'First name',
  lastName: 'Last name',
  photo: 'Photo',
  title: 'Job title',
  mobile: 'Mobile',
  workPhone: 'Work phone',
  email: 'Email',
  website: 'Website',
  address: 'Address',
  social: 'LinkedIn / social link',
};

// Character limits per input so a full card still fits in one QR code (checked by tests/qr.test.js).
export const MAX_LENGTHS = {
  firstName: 40, lastName: 40, name: 60, title: 60, mobile: 25, workPhone: 25,
  email: 80, website: 100, address: 150, social: 100,
};

export function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    me: Object.fromEntries(PERSONAL_FIELDS.map(k => [k, ''])),
    businesses: [],
    people: [],
    settings: { lastBusinessId: null, lastEvent: '', lastBackupAt: null },
  };
}

// Fills in anything missing and upgrades older data.
// When SCHEMA_VERSION goes up, add the upgrade step here.
export function migrate(raw) {
  const empty = emptyData();
  if (!raw) return empty;
  const version = raw.schemaVersion ?? SCHEMA_VERSION;
  if (version > SCHEMA_VERSION) {
    throw new Error('This data comes from a newer version of Connecta. Update the app first.');
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    me: { ...empty.me, ...raw.me },
    businesses: Array.isArray(raw.businesses) ? raw.businesses : [],
    people: Array.isArray(raw.people) ? raw.people : [],
    settings: { ...empty.settings, ...raw.settings },
  };
}

export const newId = () => crypto.randomUUID();

export function newBusiness(order = 0) {
  return { id: newId(), name: '', logo: '', title: '', overrides: {}, defaultFields: [...SHAREABLE], order };
}

export function newPerson(fields = {}) {
  return {
    id: newId(), name: '', company: '', phone: '', email: '', website: '', extra: '',
    event: '', notes: '', followUpDate: '', sharedBusinessName: '',
    metAt: new Date().toISOString(), source: 'typed',
    ...fields,
  };
}

const pad = n => String(n).padStart(2, '0');
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
