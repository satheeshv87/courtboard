// Shared helpers used by the API functions.
// Everything lives in two KV keys: "players" and "matches".
// Both are just JSON arrays - fine for a friend group's weekly games.

export async function readList(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeList(kv, key, list) {
  await kv.put(key, JSON.stringify(list));
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function badRequest(message) {
  return json({ error: message }, 400);
}

export function makeId() {
  return crypto.randomUUID();
}
