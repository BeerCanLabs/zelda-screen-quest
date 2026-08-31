const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createState,
  movePlayer,
  playerAttack,
  interactWithNPC,
  buyUpgrade,
  update,
  spawnEnemies,
} = require("../game-core.js");

// ── State Initialization ──────────────────────────────────────────────────

test("Game: starts in village screen (1,1) with default player stats", () => {
  const state = createState();
  assert.equal(state.player.screenX, 1);
  assert.equal(state.player.screenY, 1);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.maxHp, 100);
  assert.equal(state.player.points, 0);
  assert.equal(state.isGameOver, false);
  assert.equal(state.isVictory, false);
});

test("Game: safe zones like village contain no enemies", () => {
  const state = createState();
  spawnEnemies(state, 1, 1); // Starting Village
  assert.equal(state.enemies.length, 0, "No enemies should spawn in starting village");

  spawnEnemies(state, 0, 2); // Lakeside Village
  assert.equal(state.enemies.length, 0, "No enemies should spawn in lakeside village");
});

test("Game: wilderness screens spawn combatant enemies", () => {
  const state = createState();
  spawnEnemies(state, 0, 1); // Green Meadow
  assert.ok(state.enemies.length > 0, "Enemies should spawn in Green Meadow combat screen");
  assert.ok(state.enemies.every(e => ["slime", "skeleton", "bat"].includes(e.type)));
});

// ── KPF 1: Screen Boundaries & Transitions ─────────────────────────────────

test("KPF 1: player transitions to adjacent screen when hitting boundaries", () => {
  const state = createState();
  
  // Start player at right edge of (1,1) village to test transition east
  state.player.x = 620;
  state.player.y = 240; // path opening area
  state.player.screenX = 1;
  state.player.screenY = 1;

  // Move right to cross border
  movePlayer(state, 1, 0);

  // Assert transition state is activated
  assert.ok(state.screenTransition, "Transition should be active");
  assert.equal(state.screenTransition.fromX, 1);
  assert.equal(state.screenTransition.toX, 2);
  assert.equal(state.screenTransition.direction, "right");

  // Assert player coordinate has been set to opposite edge of adjacent screen
  assert.equal(state.player.screenX, 2, "Player screenX should be 2");
  assert.equal(state.player.x, 12, "Player x should be at the left edge of the new screen");
});

// ── KPF 2: Combat Engagement ───────────────────────────────────────────────

test("KPF 2: player can attack enemies and earn points on defeat", () => {
  const state = createState();
  state.player.screenX = 0;
  state.player.screenY = 1; // Green Meadow
  
  // Spawn slime enemy right in front of player
  state.enemies = [{
    id: "test_slime",
    type: "slime",
    x: 340,
    y: 260,
    width: 24,
    height: 24,
    hp: 30,
    maxHp: 30,
    speed: 1.0,
    damage: 10,
    pointsValue: 10,
  }];

  state.player.x = 320;
  state.player.y = 260;
  state.player.facing = "right";

  // Trigger attack
  const swung = playerAttack(state);
  assert.equal(swung, true, "Player should be able to swing sword");
  assert.equal(state.player.isAttacking, true);
  assert.ok(state.player.activeSwordSweep);

  // Assert enemy HP was reduced by player damage (25)
  assert.equal(state.enemies[0].hp, 5, "Slime HP should have dropped from 30 to 5");

  // Attack again (need to clear cooldown in core)
  state.player.attackCooldown = 0;
  playerAttack(state);

  // Slime HP drops to -20 and is filtered out/defeated on next update tick
  update(state);

  // Assert enemy is removed and player is awarded points
  assert.equal(state.enemies.length, 0, "Defeated slime should be removed from active lists");
  assert.equal(state.player.points, 10, "Player should be awarded 10 points for slime");
});

// ── KPF 3: Point Upgrades & Village Interactions ───────────────────────────

test("KPF 3: player can trade points for stat upgrades in villages", () => {
  const state = createState();
  state.player.screenX = 1;
  state.player.screenY = 1; // Starting Village
  state.player.points = 100; // Gift some points for trading

  // Walk player over to the Blacksmith (who lives around tx=4, ty=3)
  state.player.x = 4 * 32;
  state.player.y = 3 * 32 + 20;

  // Interact with NPC near Blacksmith
  const interacted = interactWithNPC(state);
  assert.equal(interacted, true, "Player should interact with nearby Blacksmith NPC");
  assert.ok(state.currentDialogue);
  assert.equal(state.currentDialogue.npcId, "blacksmith");
  assert.equal(state.currentDialogue.options.length, 1);

  // Execute buy upgrade action
  const bought = buyUpgrade(state);
  assert.equal(bought, true, "Upgrade purchase should succeed");
  
  // Assert points deducted and damage upgraded
  assert.equal(state.player.points, 50, "Points should decrease from 100 to 50");
  assert.equal(state.player.damage, 40, "Attack damage should increase from 25 to 40");
});

test("KPF 3: upgrade purchase fails if points are insufficient", () => {
  const state = createState();
  state.player.screenX = 1;
  state.player.screenY = 1;
  state.player.points = 10; // Not enough for Healer upgrade (costs 30)

  // Position player directly next to Healer (tx=3, ty=3), far from Blacksmith (tx=4, ty=3)
  state.player.x = 2 * 32 + 8;
  state.player.y = 3 * 32 + 16;

  interactWithNPC(state);
  assert.equal(state.currentDialogue.npcId, "healer");

  // Attempt purchase
  const bought = buyUpgrade(state);
  assert.equal(bought, false, "Upgrade should be rejected due to insufficient points");
  assert.equal(state.player.points, 10, "Points should remain untouched");
  assert.equal(state.player.maxHp, 100, "Max HP should not change");
});

// ── KPF 5: Dragon Boss & Victory State ─────────────────────────────────────

test("KPF 5: defeating the dragon boss triggers victory state", () => {
  const state = createState();
  state.player.screenX = 2;
  state.player.screenY = 2; // Dragon's Lair
  spawnEnemies(state, 2, 2);

  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0].type, "boss");
  assert.equal(state.enemies[0].hp, 300);

  // Set player damage extremely high to defeat the boss in one hit
  state.player.damage = 350;
  state.player.x = state.enemies[0].x - 10;
  state.player.y = state.enemies[0].y;
  state.player.facing = "right";

  // Hit the dragon
  playerAttack(state);
  
  // Run logic ticks
  update(state);

  // Assert victory flag is set
  assert.equal(state.isVictory, true, "Game should enter Victory state upon Boss defeat");
  assert.equal(state.isGameOver, false);
});

// ── KPF 6: Persistent Game Save State Export & Import ───────────────────────

test("KPF 6: exportSaveState and importSaveState preserve player progression across GCP sessions", () => {
  const { exportSaveState, importSaveState } = require("../game-core.js");
  const state = createState();

  // Mutate player stats (simulating gameplay progression)
  state.player.points = 250;
  state.player.damage = 50;
  state.player.shield = 15;
  state.player.screenX = 2;
  state.player.screenY = 1;
  state.player.x = 200;
  state.player.y = 150;

  const exported = exportSaveState(state);
  assert.ok(exported, "Save state export should return a payload");
  assert.equal(exported.tier, "Tier 2 Persistent Web Game");
  assert.equal(exported.player.points, 250);
  assert.equal(exported.player.damage, 50);

  // Re-create fresh game state and import save state
  const newState = createState();
  const success = importSaveState(newState, exported);

  assert.equal(success, true, "Importing valid save state should succeed");
  assert.equal(newState.player.points, 250);
  assert.equal(newState.player.damage, 50);
  assert.equal(newState.player.shield, 15);
  assert.equal(newState.player.screenX, 2);
  assert.equal(newState.player.screenY, 1);
});

