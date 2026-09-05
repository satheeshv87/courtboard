import { readList, json, badRequest } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport");
  if (!sport) return badRequest("Missing sport query param");

  const matches = (await readList(env.SCORES_KV, "matches")).filter(
    (m) => m.sport === sport
  );

  const stats = new Map();
  const bump = (name, won) => {
    if (!stats.has(name)) stats.set(name, { name, wins: 0, losses: 0 });
    const row = stats.get(name);
    if (won) row.wins += 1;
    else row.losses += 1;
  };

  for (const m of matches) {
    const winningTeam = m.winner === "A" ? m.teamA : m.teamB;
    const losingTeam = m.winner === "A" ? m.teamB : m.teamA;
    winningTeam.forEach((name) => bump(name, true));
    losingTeam.forEach((name) => bump(name, false));
  }

  const standings = [...stats.values()].map((row) => {
    const played = row.wins + row.losses;
    const winPct = played ? Math.round((row.wins / played) * 100) : 0;
    return { ...row, played, winPct };
  });

  standings.sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);
  return json(standings);
}
