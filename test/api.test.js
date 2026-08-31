const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { server, playerSaves } = require("../server.js");

let serverUrl = "";

test.before((_, done) => {
  server.listen(0, () => {
    const port = server.address().port;
    serverUrl = `http://localhost:${port}`;
    done();
  });
});

test.after((_, done) => {
  server.close(done);
});

function request(path, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const reqOptions = {
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on("error", reject);
    if (postData) req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    req.end();
  });
}

test("KPF 7: GCP Cloud Run healthcheck endpoint returns 200 OK and Tier 2 spec", async () => {
  const res = await request("/api/v1/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.tier, "Tier 2 (Persistent Web Game)");
  assert.equal(res.body.substrate, "GCP Cloud Run");
});

test("KPF 7: auth session endpoint issues token for player", async () => {
  const res = await request(
    "/api/v1/auth/session",
    { method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: "test-aiden" }
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.playerId, "test-aiden");
  assert.ok(res.body.token);
});

test("KPF 7: saving and loading player state via REST API persists data", async () => {
  const saveState = {
    version: "2.0.0",
    player: { points: 500, damage: 60, hp: 100, maxHp: 100, screenX: 1, screenY: 2 },
  };

  // POST save state
  const postRes = await request(
    "/api/v1/player/state",
    { method: "POST", headers: { "Content-Type": "application/json" } },
    { playerId: "test-aiden", state: saveState }
  );

  assert.equal(postRes.status, 200);
  assert.equal(postRes.body.success, true);

  // GET save state
  const getRes = await request("/api/v1/player/state?playerId=test-aiden");
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.success, true);
  assert.equal(getRes.body.state.player.points, 500);
  assert.equal(getRes.body.state.player.damage, 60);
});
