type LatLng = { lat: number; lng: number };

function fnv1a32(input: string): number {
  // Deterministic hash for stable jitter across runs.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function jitterFromHash(h: number, amplitudeDeg: number): number {
  // Map uint32 -> [-0.5, 0.5] then scale.
  const unit = (h % 100000) / 100000;
  return (unit - 0.5) * amplitudeDeg;
}

const CITY_CENTROIDS: Array<{ match: RegExp; base: LatLng }> = [
  { match: /pittsburgh,\s*pa/i, base: { lat: 40.4406, lng: -79.9959 } },
  { match: /homestead,\s*pa/i, base: { lat: 40.4056, lng: -79.9117 } },
  { match: /monroeville,\s*pa/i, base: { lat: 40.4212, lng: -79.7881 } },
  { match: /king of prussia,\s*pa/i, base: { lat: 40.1013, lng: -75.3836 } },
  { match: /philadelphia,\s*pa/i, base: { lat: 39.9526, lng: -75.1652 } },

  { match: /seattle,\s*wa/i, base: { lat: 47.6062, lng: -122.3321 } },
  { match: /bellevue,\s*wa/i, base: { lat: 47.6101, lng: -122.2015 } },
  { match: /redmond,\s*wa/i, base: { lat: 47.67399, lng: -122.1215 } },

  { match: /san francisco,\s*ca/i, base: { lat: 37.7749, lng: -122.4194 } },
  { match: /mountain view,\s*ca/i, base: { lat: 37.3861, lng: -122.0839 } },
  { match: /cupertino,\s*ca/i, base: { lat: 37.3229, lng: -122.0322 } },
  { match: /los gatos,\s*ca/i, base: { lat: 37.2358, lng: -121.9624 } },
  { match: /burbank,\s*ca/i, base: { lat: 34.1808, lng: -118.3090 } },
  { match: /san bruno,\s*ca/i, base: { lat: 37.6305, lng: -122.4111 } },
  { match: /menlo park,\s*ca/i, base: { lat: 37.4530, lng: -122.1817 } },
  { match: /san mateo,\s*ca/i, base: { lat: 37.5630, lng: -122.3255 } },
  { match: /santa monica,\s*ca/i, base: { lat: 34.0195, lng: -118.4912 } },
  { match: /sunnyvale,\s*ca/i, base: { lat: 37.3688, lng: -122.0363 } },

  { match: /new york,\s*ny/i, base: { lat: 40.7128, lng: -74.0060 } },

  { match: /dallas,\s*tx/i, base: { lat: 32.7767, lng: -96.7970 } },

  { match: /basking ridge,\s*nj/i, base: { lat: 40.7060, lng: -74.5493 } },

  { match: /chicago,\s*il/i, base: { lat: 41.8781, lng: -87.6298 } },

  { match: /atlanta,\s*ga/i, base: { lat: 33.7490, lng: -84.3880 } },

  { match: /bethesda,\s*md/i, base: { lat: 38.9847, lng: -77.0947 } },
  { match: /mclean,\s*va/i, base: { lat: 38.9339, lng: -77.1773 } },

  { match: /st\.\s*louis,\s*mo/i, base: { lat: 38.6270, lng: -90.1994 } },
  { match: /estero,\s*fl/i, base: { lat: 26.4381, lng: -81.8068 } },

  { match: /ann arbor,\s*mi/i, base: { lat: 42.2808, lng: -83.7430 } },
];

const STATE_CENTROIDS: Record<string, LatLng> = {
  PA: { lat: 40.8781, lng: -77.7996 },
  CA: { lat: 36.7783, lng: -119.4179 },
  WA: { lat: 47.7511, lng: -120.7401 },
  NY: { lat: 43.2994, lng: -74.2179 },
  TX: { lat: 31.9686, lng: -99.9018 },
  NJ: { lat: 40.0583, lng: -74.4057 },
  IL: { lat: 40.6331, lng: -89.3985 },
  GA: { lat: 32.1656, lng: -82.9001 },
  MD: { lat: 39.0458, lng: -76.6413 },
  VA: { lat: 37.4316, lng: -78.6569 },
  MO: { lat: 37.9643, lng: -91.8318 },
  FL: { lat: 27.6648, lng: -81.5158 },
  MI: { lat: 44.3148, lng: -85.6024 },
};

function detectStateCode(address: string): string | null {
  const m = address.match(/\b([A-Z]{2})\b(?:\s+\d{5}(?:-\d{4})?)?$/);
  if (m?.[1] && STATE_CENTROIDS[m[1]]) return m[1];
  // Also handle "... City, ST 12345" where ST isn't at very end due to trailing spaces.
  const m2 = address.match(/,\s*([A-Z]{2})\s+\d{5}\b/);
  if (m2?.[1] && STATE_CENTROIDS[m2[1]]) return m2[1];
  return null;
}

export function fakeGeocodeAddress(address: string): LatLng | null {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const city = CITY_CENTROIDS.find((c) => c.match.test(trimmed));
  const base = city?.base;

  let fallbackBase: LatLng | null = null;
  if (!base) {
    const state = detectStateCode(trimmed.toUpperCase());
    if (state) fallbackBase = STATE_CENTROIDS[state];
  }

  const chosen = base ?? fallbackBase;
  if (!chosen) return null;

  // Roughly +/- ~0.03 deg (~3km) to keep points distinct.
  const h1 = fnv1a32(trimmed);
  const h2 = fnv1a32(`${trimmed}#`);
  const lat = chosen.lat + jitterFromHash(h1, 0.06);
  const lng = chosen.lng + jitterFromHash(h2, 0.06);

  return { lat, lng };
}

