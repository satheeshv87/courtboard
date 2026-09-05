import { readList, writeList, json, badRequest, makeId } from "../_utils.js";

const SPORTS = ["tennis", "pickleball"];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport");

  let matches = await readList(env.SCORES_KV, "matches");
  if (sport) matches = matches.filter((m) => m.sport === sport);

  matches.sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
  return json(matches);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Expected JSON body");
  }

  const { sport, teamA, teamB, scoreLine, winner, gamesA, gamesB, detail } =
    body;

  if (!SPORTS.includes(sport)) return badRequest("Unknown sport");
  if (!Array.isArray(teamA) || !teamA.length)
    return badRequest("teamA needs at least one player");
  if (!Array.isArray(teamB) || !teamB.length)
    return badRequest("teamB needs at least one player");
  if (winner !== "A" && winner !== "B")
    return badRequest("winner must be 'A' or 'B'");
  if (!scoreLine) return badRequest("scoreLine is required");

  const match = {
    id: makeId(),
    sport,
    teamA,
    teamB,
    scoreLine,
    gamesA: gamesA ?? null,
    gamesB: gamesB ?? null,
    winner,
    detail: detail ?? null,
    playedAt: new Date().toISOString(),
  };

  const matches = await readList(env.SCORES_KV, "matches");
  matches.push(match);
  await writeList(env.SCORES_KV, "matches", matches);
  return json(match, 201);
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return badRequest("Missing id");

  const matches = await readList(env.SCORES_KV, "matches");
  const next = matches.filter((m) => m.id !== id);
  await writeList(env.SCORES_KV, "matches", next);
  return json(next);
}
