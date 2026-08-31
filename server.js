const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;

// Persistent game save memory store (in-memory with file fallback for local/cloud persistence)
const SAVE_DATA_FILE = path.join(__dirname, "player_saves.json");
let playerSaves = {};

// Load existing saves if file exists
if (fs.existsSync(SAVE_DATA_FILE)) {
  try {
    playerSaves = JSON.parse(fs.readFileSync(SAVE_DATA_FILE, "utf8"));
  } catch (err) {
    console.error("Error loading save file:", err);
    playerSaves = {};
  }
}

function persistSaves() {
  try {
    fs.writeFileSync(SAVE_DATA_FILE, JSON.stringify(playerSaves, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing save file:", err);
  }
}

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  // CORS Headers for cross-origin frontend (e.g., GitHub Pages accessing Cloud Run API)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;

  // ── REST API Routes for Draft Tier 2 Persistence ──────────────────────────

  // 1. Healthcheck Endpoint
  if (pathname === "/api/v1/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "zelda-screen-quest-api",
        tier: "Tier 2 (Persistent Web Game)",
        substrate: "GCP Cloud Run",
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // 2. Auth / Player Session Endpoint
  if (pathname === "/api/v1/auth/session" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {}

      const playerId = data.playerId || "aiden-player-1";
      const token = Buffer.from(playerId + "-session").toString("base64");

      if (!playerSaves[playerId]) {
        playerSaves[playerId] = {
          playerId,
          created: new Date().toISOString(),
          lastSaved: new Date().toISOString(),
          state: null,
        };
        persistSaves();
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          token,
          playerId,
          hasSavedState: !!playerSaves[playerId].state,
          lastSaved: playerSaves[playerId].lastSaved,
        })
      );
    });
    return;
  }

  // 3. Player State GET / POST / DELETE Endpoint
  if (pathname === "/api/v1/player/state") {
    const authHeader = req.headers["authorization"] || "";
    const queryPlayerId = urlObj.searchParams.get("playerId") || "aiden-player-1";

    if (req.method === "GET") {
      const record = playerSaves[queryPlayerId];
      if (record && record.state) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            playerId: queryPlayerId,
            lastSaved: record.lastSaved,
            state: record.state,
          })
        );
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            message: "No persistent save state found for player",
          })
        );
      }
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        let payload = {};
        try {
          payload = JSON.parse(body);
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, message: "Invalid JSON payload" }));
          return;
        }

        const targetId = payload.playerId || queryPlayerId;
        const now = new Date().toISOString();

        playerSaves[targetId] = {
          playerId: targetId,
          lastSaved: now,
          state: payload.state || payload,
        };
        persistSaves();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            playerId: targetId,
            lastSaved: now,
            message: "Game state persisted to GCP Cloud Run backend",
          })
        );
      });
      return;
    }

    if (req.method === "DELETE") {
      delete playerSaves[queryPlayerId];
      persistSaves();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Persistent save state cleared" }));
      return;
    }
  }

  // ── Static Asset Serving ──────────────────────────────────────────────────
  let filePath = pathname === "/" ? "./index.html" : "." + pathname;
  filePath = filePath.split("?")[0].split("#")[0];

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Zelda Screen Quest GCP Cloud Run backend running at http://localhost:${PORT}`);
  });
}

module.exports = { server, playerSaves };
