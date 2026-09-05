/* Courtboard - shared scoreboard for weekly tennis & pickleball
   Scores are entered after a match finishes: you record however many
   sets (tennis) or games (pickleball) were played and who won each one. */

// ---------------------------------------------------------------
// API helper
// ---------------------------------------------------------------
const api = {
  async get(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error("GET failed");
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error || "POST failed");
    }
    return r.json();
  },
  async del(path) {
    const r = await fetch(path, { method: "DELETE" });
    if (!r.ok) throw new Error("DELETE failed");
    return r.json();
  },
};

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------------------------------------------------------------
// App state
// ---------------------------------------------------------------
const app = {
  sport: "tennis",
  players: [],
  setupFormat: { tennis: "singles", pickleball: "doubles" },
};

let setRowCount = 0; // used to give each set/game row a running number

function unitLabel() {
  return app.sport === "tennis" ? "Set" : "Game";
}

// ---------------------------------------------------------------
// Log-match form
// ---------------------------------------------------------------
function renderSetup() {
  const sport = app.sport;
  const fmt = app.setupFormat[sport];
  const label = unitLabel();

  const html = `
    <div class="field">
      <label>Match type</label>
      <div class="toggle-pair" id="fmtToggle">
        <button data-fmt="singles" class="${fmt === "singles" ? "active" : ""}">Singles</button>
        <button data-fmt="doubles" class="${fmt === "doubles" ? "active" : ""}">Doubles</button>
      </div>
    </div>
    <div class="team-row">
      <div class="field">
        <label>Team A</label>
        <input list="playersList" id="teamA1" placeholder="Player name" />
        <input list="playersList" id="teamA2" placeholder="Partner name" class="doubles-only" style="margin-top:8px;display:${fmt === "doubles" ? "block" : "none"}" />
      </div>
      <div class="field">
        <label>Team B</label>
        <input list="playersList" id="teamB1" placeholder="Player name" />
        <input list="playersList" id="teamB2" placeholder="Partner name" class="doubles-only" style="margin-top:8px;display:${fmt === "doubles" ? "block" : "none"}" />
      </div>
    </div>
    <div class="field">
      <label>${label} scores</label>
      <div id="setRows"></div>
      <button type="button" class="btn ghost" id="addSetBtn" style="margin-top:8px">+ Add ${label.toLowerCase()}</button>
    </div>
    <datalist id="playersList">${app.players.map((p) => `<option value="${escapeHtml(p.name)}">`).join("")}</datalist>
    <div class="error-msg" id="setupError"></div>
    <button class="btn" id="saveMatchBtn" style="margin-top:14px">Save match</button>
  `;

  document.getElementById("setupCard").innerHTML = html;
  setRowCount = 0;
  document.getElementById("setRows").innerHTML = "";
  addSetRow();
  addSetRow();
  wireSetupEvents();
}

function addSetRow() {
  const idx = setRowCount++;
  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML = `
    <span class="set-label">${unitLabel()} ${idx + 1}</span>
    <input type="number" min="0" inputmode="numeric" class="set-input" data-team="a" />
    <span class="set-sep">-</span>
    <input type="number" min="0" inputmode="numeric" class="set-input" data-team="b" />
    <button type="button" class="set-remove" aria-label="Remove this row">✕</button>
  `;
  document.getElementById("setRows").appendChild(row);
  row.querySelector(".set-remove").addEventListener("click", () => {
    if (document.querySelectorAll("#setRows .set-row").length <= 1) return;
    row.remove();
    renumberSetRows();
  });
}

function renumberSetRows() {
  document.querySelectorAll("#setRows .set-row").forEach((row, i) => {
    row.querySelector(".set-label").textContent = `${unitLabel()} ${i + 1}`;
  });
}

function showSetupError(msg) {
  const el = document.getElementById("setupError");
  el.textContent = msg;
  el.style.display = "block";
}

function fieldVal(id) {
  return document.getElementById(id).value.trim();
}

function wireSetupEvents() {
  document.querySelectorAll("#fmtToggle button").forEach((b) =>
    b.addEventListener("click", () => {
      app.setupFormat[app.sport] = b.dataset.fmt;
      document.querySelectorAll("#fmtToggle button").forEach((x) => x.classList.toggle("active", x === b));
      const show = b.dataset.fmt === "doubles";
      document.querySelectorAll(".doubles-only").forEach((el) => (el.style.display = show ? "block" : "none"));
    })
  );
  document.getElementById("addSetBtn").addEventListener("click", addSetRow);
  document.getElementById("saveMatchBtn").addEventListener("click", saveMatch);
}

async function saveMatch() {
  const errEl = document.getElementById("setupError");
  errEl.style.display = "none";

  const fmt = app.setupFormat[app.sport];
  const a1 = fieldVal("teamA1");
  const a2 = fmt === "doubles" ? fieldVal("teamA2") : null;
  const b1 = fieldVal("teamB1");
  const b2 = fmt === "doubles" ? fieldVal("teamB2") : null;

  if (!a1 || !b1 || (fmt === "doubles" && (!a2 || !b2))) {
    showSetupError("Enter a name for every player.");
    return;
  }

  const teamA = fmt === "doubles" ? [a1, a2] : [a1];
  const teamB = fmt === "doubles" ? [b1, b2] : [b1];
  const allNames = [...teamA, ...teamB].map((n) => n.toLowerCase());
  if (new Set(allNames).size !== allNames.length) {
    showSetupError("Each player can only appear once in a match.");
    return;
  }

  const label = unitLabel();
  const rows = [...document.querySelectorAll("#setRows .set-row")];
  if (!rows.length) {
    showSetupError(`Add at least one ${label.toLowerCase()} score.`);
    return;
  }

  const sets = [];
  for (const row of rows) {
    const aRaw = row.querySelector('[data-team="a"]').value.trim();
    const bRaw = row.querySelector('[data-team="b"]').value.trim();
    if (aRaw === "" || bRaw === "") {
      showSetupError(`Fill in every ${label.toLowerCase()} score, or remove any empty rows.`);
      return;
    }
    const a = parseInt(aRaw, 10);
    const b = parseInt(bRaw, 10);
    if (Number.isNaN(a) || Number.isNaN(b) || a < 0 || b < 0) {
      showSetupError("Scores must be zero or a positive whole number.");
      return;
    }
    if (a === b) {
      showSetupError(`A ${label.toLowerCase()} score can't be tied - every ${label.toLowerCase()} needs a winner.`);
      return;
    }
    sets.push({ a, b });
  }

  const setsA = sets.filter((s) => s.a > s.b).length;
  const setsB = sets.filter((s) => s.b > s.a).length;
  if (setsA === setsB) {
    showSetupError(`Team A and Team B have each won ${setsA} ${label.toLowerCase()}${setsA === 1 ? "" : "s"} - add a deciding one or fix the scores.`);
    return;
  }

  const winner = setsA > setsB ? "A" : "B";
  const scoreLine = sets.map((s) => `${s.a}-${s.b}`).join(", ");

  const payload = {
    sport: app.sport,
    teamA,
    teamB,
    scoreLine,
    winner,
    gamesA: setsA,
    gamesB: setsB,
    detail: { sets },
  };

  const btn = document.getElementById("saveMatchBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await api.post("/api/matches", payload);
    for (const name of [...teamA, ...teamB]) {
      await api.post("/api/players", { name });
    }
    app.players = await api.get("/api/players");
    switchView("history");
  } catch (err) {
    showSetupError("Could not save the match. Check your connection and try again.");
    btn.disabled = false;
    btn.textContent = "Save match";
  }
}

// ---------------------------------------------------------------
// History view
// ---------------------------------------------------------------
async function loadHistory() {
  const el = document.getElementById("historyList");
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const matches = await api.get(`/api/matches?sport=${app.sport}`);
    renderHistory(matches);
  } catch {
    el.innerHTML = '<div class="empty-state">Could not load match history.</div>';
  }
}

function renderHistory(matches) {
  const el = document.getElementById("historyList");
  if (!matches.length) {
    el.innerHTML = `<div class="empty-state"><span class="display">No matches yet</span>Log one to see it here.</div>`;
    return;
  }
  el.innerHTML = matches
    .map((m) => {
      const nameA = m.teamA.join(" & ");
      const nameB = m.teamB.join(" & ");
      const dateStr = new Date(m.playedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `<div class="match-item">
        <button class="del" data-id="${m.id}">remove</button>
        <div class="row1"><span class="${m.winner === "A" ? "win" : ""}">${escapeHtml(nameA)}</span> vs <span class="${m.winner === "B" ? "win" : ""}">${escapeHtml(nameB)}</span></div>
        <div class="row2">${dateStr}</div>
        <div class="score-line">${escapeHtml(m.scoreLine)}</div>
      </div>`;
    })
    .join("");

  el.querySelectorAll(".del").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this match?")) return;
      try {
        await api.del(`/api/matches?id=${btn.dataset.id}`);
        loadHistory();
      } catch {
        alert("Could not remove match.");
      }
    })
  );
}

// ---------------------------------------------------------------
// Leaderboard view
// ---------------------------------------------------------------
async function loadLeaderboard() {
  const el = document.getElementById("leaderboardTable");
  el.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    const standings = await api.get(`/api/leaderboard?sport=${app.sport}`);
    renderLeaderboard(standings);
  } catch {
    el.innerHTML = '<div class="empty-state">Could not load the leaderboard.</div>';
  }
}

function renderLeaderboard(standings) {
  const el = document.getElementById("leaderboardTable");
  if (!standings.length) {
    el.innerHTML = `<div class="empty-state"><span class="display">No standings yet</span>Log a match to start the leaderboard.</div>`;
    return;
  }
  el.innerHTML = `<table class="board">
    <thead><tr><th>Player</th><th class="num">Played</th><th class="num">Wins</th><th class="num">Losses</th><th class="num">Win %</th></tr></thead>
    <tbody>
      ${standings
        .map(
          (s) =>
            `<tr><td>${escapeHtml(s.name)}</td><td class="num">${s.played}</td><td class="num">${s.wins}</td><td class="num">${s.losses}</td><td class="num">${s.winPct}%</td></tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

// ---------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------
function switchView(name) {
  document.querySelectorAll("section.view").forEach((s) => s.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  document.querySelectorAll("nav.bottom button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name)
  );
  if (name === "new") renderSetup();
  if (name === "history") loadHistory();
  if (name === "leaderboard") loadLeaderboard();
}

function wireNav() {
  document.querySelectorAll("nav.bottom button").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view))
  );
}

function wireSportSwitch() {
  document.querySelectorAll("#sportSwitch button").forEach((b) =>
    b.addEventListener("click", () => {
      app.sport = b.dataset.sport;
      document.querySelectorAll("#sportSwitch button").forEach((x) => x.classList.toggle("active", x === b));
      const activeView = document.querySelector("section.view.active").id;
      if (activeView === "view-new") renderSetup();
      if (activeView === "view-history") loadHistory();
      if (activeView === "view-leaderboard") loadLeaderboard();
    })
  );
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
async function init() {
  try {
    app.players = await api.get("/api/players");
  } catch {
    app.players = [];
  }
  renderSetup();
  wireNav();
  wireSportSwitch();
}

document.addEventListener("DOMContentLoaded", init);
