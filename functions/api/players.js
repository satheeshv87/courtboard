import { readList, writeList, json, badRequest, makeId } from "../_utils.js";

export async function onRequestGet({ env }) {
  const players = await readList(env.SCORES_KV, "players");
  players.sort((a, b) => a.name.localeCompare(b.name));
  return json(players);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected JSON body");
  }

  const name = (body.name || "").trim();
  if (!name) return badRequest("Player name is required");
  if (name.length > 40) return badRequest("Player name is too long");

  const players = await readList(env.SCORES_KV, "players");
  const exists = players.some(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) return json(players);

  players.push({ id: makeId(), name });
  await writeList(env.SCORES_KV, "players", players);
  return json(players, 201);
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return badRequest("Missing id");

  const players = await readList(env.SCORES_KV, "players");
  const next = players.filter((p) => p.id !== id);
  await writeList(env.SCORES_KV, "players", next);
  return json(next);
}
