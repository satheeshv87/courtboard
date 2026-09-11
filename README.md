# Courtboard

A shared scoreboard for your weekly tennis and pickleball games. Log the
set/game scores once you're done playing, and everyone's phone sees the same
match history and leaderboard - hosted free on Cloudflare.

No build step, no database to manage - it's a static site plus a couple of
tiny serverless functions, backed by Cloudflare's free KV storage.

## What's in here

```
public/
  index.html        the app shell and styling
  app.js            scoring engines + all UI logic
functions/
  _utils.js         shared KV helpers
  api/players.js    list / add players
  api/matches.js    list / record / delete matches
  api/leaderboard.js  computed standings per sport
worker.js           Worker entry point - routes /api/* to the handlers
                     above, everything else falls through to static assets
wrangler.toml       Worker config (entry point, assets, KV binding)
```

This is deployed as a single **Cloudflare Worker** with static assets, not
Cloudflare Pages - that's why there's a `worker.js` entry point routing
`/api/*` requests to the handler files under `functions/`.

## Deploy it (free, ~10 minutes)

You'll need a Cloudflare account (free tier is enough - this app is tiny and
will stay well within the free limits for a friend group).

### 1. Create the KV namespace (the shared storage)

**Via the CLI** (needs [Node.js](https://nodejs.org) installed):

```
npx wrangler login
npx wrangler kv namespace create SCORES_KV
```

That prints an `id` - put it in `wrangler.toml` under `[[kv_namespaces]]`
(uncomment those lines and fill in the id).

**Or via the dashboard**, if you'd rather not use the CLI at all: go to
[Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** →
**KV**, click **Create a namespace**, name it `courtboard-scores`, and save
(you'll bind it in step 3 instead of editing `wrangler.toml`).

### 2. Deploy the site

**With the CLI:**

```
npx wrangler deploy
```

**Or connect this GitHub repo** in the dashboard under **Workers & Pages** →
**Create** → **Import a repository**, so it redeploys automatically on every
push.

### 3. Bind the KV namespace to the site

If you didn't already add the namespace id to `wrangler.toml` in step 1,
this is the one step that's easy to miss, and the app won't save anything
without it:

1. Open your Worker in the dashboard → **Settings** → **Bindings**.
2. Click **Add** → **KV namespace**.
3. Variable name: `SCORES_KV` (must match exactly).
4. KV namespace: pick `courtboard-scores`.
5. Save - this redeploys automatically with the binding attached.

### 4. Use it

Your app is live at `https://<worker-name>.<your-subdomain>.workers.dev`.
Share that link with your group - everyone who opens it sees the same
players, matches, and leaderboard, no login needed.

## How it works

- Pick the sport (tennis or pickleball), singles or doubles, and who played.
- Enter the score of each set (tennis) or game (pickleball) after you're
  done playing - just the two numbers, e.g. `6-4` or `11-7`. Add as many
  rows as sets/games were played.
- The app works out who won the match from those scores (whoever won more
  sets/games) and saves it to the shared history and leaderboard.
- There's no live point-by-point tracking - this is purely for recording
  results after the fact.

## A couple of honest limitations

- There are no accounts or access control - anyone with the link can add
  players, record matches, or delete history. Fine for a private group link,
  not something to post publicly.
- If two people record a live match on the same court at the same time under
  the same player names, nothing prevents duplicate matches - it's meant for
  one scorer per match.
- The free Cloudflare tier this uses (Pages + Workers KV) comfortably covers
  a group playing several matches a week; you'd only hit limits with very
  heavy use (KV's free tier is 100,000 reads and 1,000 writes per day).

Want changes - different sports, a doubles-only mode, court/location
tracking, a "who owes who" side bet tally? Just ask and I can extend it.
