export type MeetingSuggestion = {
  name: string;
  type: string;
  address: string;
  reason: string;
  placeId: string;
};

const PLACE_TYPES = [
  { type: 'shopping_mall',   label: 'Shopping Mall',   reason: 'Busy, well-lit, and public with security on site.' },
  { type: 'police',          label: 'Police Station',  reason: 'Safest possible exchange location.' },
  { type: 'transit_station', label: 'Transit Station', reason: 'High foot traffic and publicly monitored.' },
  { type: 'cafe',            label: 'Café',            reason: 'Relaxed public setting with staff present.' },
  { type: 'supermarket',     label: 'Supermarket',     reason: 'Busy public space with CCTV coverage.' },
  { type: 'bank',            label: 'Bank',            reason: 'Secure public location with cameras.' },
];

export async function getMeetingSuggestions(
  location1: { lat: number; lng: number },
  location2: { lat: number; lng: number }
): Promise<MeetingSuggestion[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set in .env');

  const midLat = (location1.lat + location2.lat) / 2;
  const midLng = (location1.lng + location2.lng) / 2;
  const distanceKm = haversineKm(location1, location2);
  const radius = Math.min(5000, Math.max(500, Math.round(distanceKm * 500)));

  const results: MeetingSuggestion[] = [];
  const seenIds = new Set<string>();

  for (const { type, label, reason } of PLACE_TYPES) {
    if (results.length >= 3) break;

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.id',
        },
        body: JSON.stringify({
          includedTypes: [type],
          maxResultCount: 5,
          locationRestriction: {
            circle: {
              center: { latitude: midLat, longitude: midLng },
              radius,
            },
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`Places API error for ${type}:`, data?.error?.message);
        continue;
      }

      for (const place of data.places ?? []) {
        if (results.length >= 3) break;
        if (seenIds.has(place.id)) continue;

        seenIds.add(place.id);
        results.push({
          name: place.displayName?.text ?? 'Unknown',
          type: label,
          address: place.formattedAddress ?? '',
          reason,
          placeId: place.id,
        });
        break;
      }
    } catch (e) {
      console.error(`Failed fetching places for type ${type}:`, e);
    }
  }

  if (results.length === 0) {
    throw new Error('No meeting spots found nearby. Try again.');
  }

  return results;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(a.lat)) * Math.cos(deg2rad(b.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
