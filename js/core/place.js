// Where the user is now, as a place name for the Event field: the phone's location, named by OpenStreetMap
// (free, no account). Only the coordinates are sent: when the app opens and when a person is added.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/ (max 1 request a second; ours is far less).

const NEAR_METRES = 150; // still at the same place: reuse the last name instead of asking again
let last = null; // { lat, lon, name }
let pending = null; // a lookup still running: later callers wait for it instead of asking twice

// "Hermanus Golf Club, Hermanus", or "54 Stormvoël Crescent, Hermanus" when there is no named venue.
export function placeName(r) {
  const a = r.address ?? {};
  const street = a.road ? [a.house_number, a.road].filter(Boolean).join(' ') : '';
  const venue = r.name && r.name !== a.road ? r.name : '';
  // Town before city: in South Africa "city" is the municipality ("Overstrand Local Municipality"), "town" is Hermanus.
  const town = a.town || a.village || a.city || a.suburb || '';
  return [venue || street, town].filter(Boolean).join(', ');
}

const metresBetween = (a, b) => {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.hypot(x, y) * 6371000;
};

// The place name, or '' when location is off, refused, offline or unknown. Never throws.
export function currentPlace(options) {
  pending ??= lookUp(options).finally(() => { pending = null; });
  return pending;
}

async function lookUp({ geo = globalThis.navigator?.geolocation, fetchFn = globalThis.fetch } = {}) {
  try {
    // The phone's own timeout only starts once permission is given; a question left unanswered would wait forever.
    let giveUp;
    const { coords } = await new Promise((ok, fail) => {
      geo.getCurrentPosition(ok, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 });
      giveUp = setTimeout(() => fail(new Error('no answer')), 20000);
    }).finally(() => clearTimeout(giveUp));
    const here = { lat: coords.latitude, lon: coords.longitude };
    if (last && metresBetween(last, here) < NEAR_METRES) return last.name;
    const res = await fetchFn(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${here.lat.toFixed(5)}&lon=${here.lon.toFixed(5)}&zoom=18&addressdetails=1`);
    if (!res.ok) return '';
    const name = placeName(await res.json());
    if (name) last = { ...here, name };
    return name;
  } catch {
    return '';
  }
}
