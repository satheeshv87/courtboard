// Worker entry point. This project is deployed as a Cloudflare Worker
// (not Pages), so the functions/api/*.js files are NOT auto-routed the
// way they would be under Pages Functions - we dispatch to them here.
import * as matches from "./functions/api/matches.js";
import * as players from "./functions/api/players.js";
import * as leaderboard from "./functions/api/leaderboard.js";
import { badRequest } from "./functions/_utils.js";

const routes = {
  "/api/matches": matches,
  "/api/players": players,
  "/api/leaderboard": leaderboard,
};

const handlerNames = {
  GET: "onRequestGet",
  POST: "onRequestPost",
  DELETE: "onRequestDelete",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const mod = routes[url.pathname];

    if (mod) {
      const handler = mod[handlerNames[request.method]];
      if (!handler) return badRequest("Method not allowed");
      return handler({ request, env });
    }

    return env.ASSETS.fetch(request);
  },
};
