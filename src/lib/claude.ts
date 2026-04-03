export type MeetingSuggestion = {
  name: string;
  type: string;
  address: string;
  reason: string;
};

export async function getMeetingSuggestions(
  location1: { lat: number; lng: number },
  location2: { lat: number; lng: number },
  cityContext: { city1: string; city2: string; country: string }
): Promise<MeetingSuggestion[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set in .env');

  const midLat = (location1.lat + location2.lat) / 2;
  const midLng = (location1.lng + location2.lng) / 2;

  const locationContext = cityContext.city1 === cityContext.city2
    ? `Both users are in ${cityContext.city1}, ${cityContext.country}.`
    : `User 1 is in ${cityContext.city1} and User 2 is in ${cityContext.city2}, both in ${cityContext.country}.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Two users from a marketplace app want to meet to exchange an item safely. ${locationContext}

The midpoint between them is approximately lat ${midLat.toFixed(4)}, lng ${midLng.toFixed(4)}.

Suggest exactly 3 real, well-known public meeting places near this midpoint in ${cityContext.country}. Use real place names that actually exist in that area.

Prioritize: shopping malls, coffee shops, metro/bus stations, police stations, or busy public areas.

Respond with ONLY a valid JSON array, no markdown, no explanation:
[
  { "name": "Real Place Name", "type": "e.g. Shopping Mall", "address": "Real street or district name", "reason": "One sentence why this is a good safe spot" },
  { "name": "...", "type": "...", "address": "...", "reason": "..." },
  { "name": "...", "type": "...", "address": "...", "reason": "..." }
]`,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Claude API error response:', JSON.stringify(data));
    throw new Error(`Claude API error ${response.status}: ${data?.error?.message ?? 'Unknown error'}`);
  }

  const text: string = data.content[0].text.trim();
  console.log('Claude raw response:', text);

  // Strip markdown code blocks if Claude wraps the JSON anyway
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(clean) as MeetingSuggestion[];
  } catch (e) {
    console.error('Failed to parse Claude response as JSON:', clean);
    throw new Error('Claude returned invalid JSON');
  }
}
