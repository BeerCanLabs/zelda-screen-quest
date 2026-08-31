/*
 * Zelda Screen Quest — game-core.js
 *
 * Pure, environment-agnostic Zelda-style game logic. No DOM, no window, no canvas.
 * Exported via UMD so it can be run in Node.js (for testing) and the browser.
 */
(function (root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.ZeldaCore = core;
})(typeof window !== "undefined" ? window : globalThis, () => {
  // Screen dimensions
  const SCREEN_WIDTH = 640;
  const SCREEN_HEIGHT = 480;
  const TILE_SIZE = 32;
  const COLS = 20; // 640 / 32
  const ROWS = 15; // 480 / 32

  // Tile types
  const TILES = {
    GRASS: 0,
    WALL: 1,      // Obstacle (tree/rock)
    WATER: 2,     // Obstacle (pond/river)
    PATH: 3,      // Walkable path
    HOUSE_WALL: 4,// Obstacle (house border)
    FLOOR: 5,     // Walkable interior floor
    DOOR: 6,      // Walkable door / NPC trigger
  };

  // Screen Grid: 3x3
  const WORLD_WIDTH = 3;
  const WORLD_HEIGHT = 3;

  // Let's define the screen contents programmatically or statically.
  // Each screen is a COLS x ROWS grid.
  const mapData = {};

  // Build static world layouts
  function initMaps() {
    for (let sy = 0; sy < WORLD_HEIGHT; sy++) {
      for (let sx = 0; sx < WORLD_WIDTH; sx++) {
        const key = `${sx},${sy}`;
        const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILES.GRASS));

        // 1. Screen boundaries - add obstacles around edges, but open paths where adjacent screens exist
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const isEdge = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
            if (isEdge) {
              let solid = true;
              // Check if we should leave an opening for screen transitions
              // North path opening (middle cols)
              if (r === 0 && sy > 0 && c >= 9 && c <= 10) solid = false;
              // South path opening
              if (r === ROWS - 1 && sy < WORLD_HEIGHT - 1 && c >= 9 && c <= 10) solid = false;
              // West path opening (middle rows)
              if (c === 0 && sx > 0 && r >= 6 && r <= 8) solid = false;
              // East path opening
              if (c === COLS - 1 && sx < WORLD_WIDTH - 1 && r >= 6 && r <= 8) solid = false;

              if (solid) {
                grid[r][c] = TILES.WALL;
              }
            }
          }
        }

        // 2. Add screen-specific layouts
        if (sx === 1 && sy === 1) {
          // Starting Village: center plaza, nice paths, a house
          for (let r = 5; r <= 9; r++) {
            for (let c = 8; c <= 12; c++) {
              grid[r][c] = TILES.FLOOR; // Town square
            }
          }
          // Build Healer/Blacksmith house on top left
          for (let r = 2; r <= 4; r++) {
            for (let c = 2; c <= 6; c++) {
              if (r === 4 && c === 4) {
                grid[r][c] = TILES.DOOR; // Entrance
              } else {
                grid[r][c] = TILES.HOUSE_WALL;
              }
            }
          }
          // Build Wizard's shop on top right
          for (let r = 2; r <= 4; r++) {
            for (let c = 13; c <= 17; c++) {
              if (r === 4 && c === 15) {
                grid[r][c] = TILES.DOOR; // Entrance
              } else {
                grid[r][c] = TILES.HOUSE_WALL;
              }
            }
          }
          // Draw connecting paths
          for (let r = 0; r < ROWS; r++) {
            grid[r][9] = TILES.PATH;
            grid[r][10] = TILES.PATH;
          }
          for (let c = 0; c < COLS; c++) {
            grid[7][c] = TILES.PATH;
            grid[8][c] = TILES.PATH;
          }
        } else if (sx === 0 && sy === 2) {
          // Lakeside Village (Peaceful): lake in the center-left
          for (let r = 4; r <= 11; r++) {
            for (let c = 2; c <= 10; c++) {
              grid[r][c] = TILES.WATER;
            }
          }
          // Shield maker house on bottom-right
          for (let r = 10; r <= 12; r++) {
            for (let c = 13; c <= 17; c++) {
              if (r === 10 && c === 15) {
                grid[r][c] = TILES.DOOR;
              } else {
                grid[r][c] = TILES.HOUSE_WALL;
              }
            }
          }
          // Paths
          for (let c = 10; c < COLS; c++) {
            grid[7][c] = TILES.PATH;
            grid[8][c] = TILES.PATH;
          }
          for (let r = 0; r < 10; r++) {
            grid[r][15] = TILES.PATH;
          }
        } else if (sx === 2 && sy === 2) {
          // Dragon's Lair: boss arena, some pillars (walls) and volcanic vibe
          for (let r = 3; r <= 11; r++) {
            for (let c = 3; c <= 16; c++) {
              if ((r === 4 || r === 10) && (c === 5 || c === 14)) {
                grid[r][c] = TILES.WALL; // Pillars
              }
            }
          }
        } else {
          // Combat screens: random trees/rocks (walls) or ponds (water)
          // Seeded-like random to make it look reproducible
          const seed = sx * 13 + sy * 37;
          let counter = 0;
          function rand() {
            const x = Math.sin(seed + counter++) * 10000;
            return x - Math.floor(x);
          }

          // Add some rocks/trees
          for (let i = 0; i < 8; i++) {
            const r = Math.floor(rand() * (ROWS - 4)) + 2;
            const c = Math.floor(rand() * (COLS - 4)) + 2;
            grid[r][c] = TILES.WALL;
          }
          // Add a small pond
          if (rand() > 0.5) {
            const r = Math.floor(rand() * (ROWS - 6)) + 3;
            const c = Math.floor(rand() * (COLS - 6)) + 3;
            grid[r][c] = TILES.WATER;
            grid[r + 1][c] = TILES.WATER;
            grid[r][c + 1] = TILES.WATER;
            grid[r + 1][c + 1] = TILES.WATER;
          }
        }

        mapData[key] = grid;
      }
    }
  }

  initMaps();

  // NPCs config
  const NPCS = [
    { id: "elder", name: "Village Elder", screenX: 1, screenY: 1, tx: 10, ty: 6, dialogue: "Welcome Aiden! The outer realms are infested with monsters. Fight them to earn points, then trade with the Blacksmith, Healer, or Wizard for strength! Clear the Swamp to reach the Dragon's Lair." },
    { id: "blacksmith", name: "Blacksmith", screenX: 1, screenY: 1, tx: 4, ty: 3, cost: 50, level: 1, maxLevel: 5, dialogue: "Want a sharper sword? I can upgrade your attack power for 50 points!" },
    { id: "healer", name: "Village Healer", screenX: 1, screenY: 1, tx: 3, ty: 3, cost: 30, level: 1, maxLevel: 5, dialogue: "I can increase your Max Health for 30 points. It will heal you fully too!" },
    { id: "wizard", name: "Wind Wizard", screenX: 1, screenY: 1, tx: 15, ty: 3, cost: 40, level: 1, maxLevel: 3, dialogue: "Need more agility? I can upgrade your speed for 40 points!" },
    { id: "shieldmaker", name: "Shield Smith", screenX: 0, screenY: 2, tx: 15, ty: 9, cost: 60, level: 0, maxLevel: 3, dialogue: "A shield blocks monster attacks! Upgrade shield defense for 60 points." }
  ];

  function createState() {
    return {
      player: {
        x: 320, // Middle of screen
        y: 260,
        width: 22,
        height: 22,
        hp: 100,
        maxHp: 100,
        damage: 25,
        speed: 3,
        points: 0,
        shield: 0,
        screenX: 1, // Start in Starting Village (1,1)
        screenY: 1,
        facing: "down",
        isAttacking: false,
        attackCooldown: 0,
        hurtCooldown: 0,
        activeSwordSweep: null, // {x, y, width, height, timer}
      },
      enemies: [], // Active enemies on current screen
      isVictory: false,
      isGameOver: false,
      currentDialogue: null, // { npcId, name, text, options: [] }
      screenTransition: null, // { fromX, fromY, toX, toY, progress, direction }
      bossSpawned: false,
      activeProjectiles: [], // for boss attacks
    };
  }

  // Get tile at pixel coordinate
  function getTileAt(px, py, screenX, screenY) {
    const tileX = Math.floor(px / TILE_SIZE);
    const tileY = Math.floor(py / TILE_SIZE);
    if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return TILES.WALL;
    const key = `${screenX},${screenY}`;
    const map = mapData[key];
    if (!map) return TILES.WALL;
    return map[tileY][tileX];
  }

  // Check if tile index is solid (impassable)
  function isSolidTile(tileType) {
    return (
      tileType === TILES.WALL ||
      tileType === TILES.WATER ||
      tileType === TILES.HOUSE_WALL
    );
  }

  // Check collision for a box on a specific screen
  function isColliding(x, y, width, height, screenX, screenY) {
    // Check screen boundaries first
    if (x < 0 || x + width > SCREEN_WIDTH || y < 0 || y + height > SCREEN_HEIGHT) {
      return true;
    }

    // Check four corners of the bounding box
    const corners = [
      { x: x, y: y },
      { x: x + width, y: y },
      { x: x, y: y + height },
      { x: x + width, y: y + height },
    ];

    for (const p of corners) {
      const tile = getTileAt(p.x, p.y, screenX, screenY);
      if (isSolidTile(tile)) return true;
    }
    return false;
  }

  // Rectangular bounding box collision helper
  function rectOverlap(r1, r2) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  // Spawn enemies for a screen
  function spawnEnemies(state, screenX, screenY) {
    state.enemies = [];
    state.activeProjectiles = [];

    // Villages are safe zones!
    const isSafeZone = (screenX === 1 && screenY === 1) || (screenX === 0 && screenY === 2);
    if (isSafeZone) return;

    // Dragon's Lair: Boss arena!
    if (screenX === 2 && screenY === 2) {
      state.enemies.push({
        id: "boss_dragon",
        type: "boss",
        name: "Infernal Dragon",
        x: 280,
        y: 150,
        width: 64,
        height: 64,
        hp: 300,
        maxHp: 300,
        speed: 1.0,
        damage: 25,
        pointsValue: 100,
        shootCooldown: 0,
        facing: "down"
      });
      state.bossSpawned = true;
      return;
    }

    // Otherwise, spawn standard combat zone enemies
    const seed = screenX * 17 + screenY * 43;
    let counter = 0;
    function rand() {
      const x = Math.sin(seed + counter++) * 10000;
      return x - Math.floor(x);
    }

    // Decide how many enemies to spawn based on screen difficulty
    // Swamp (1,2) and Mountain (0,0) are harder, spawn 4-5. Others spawn 2-3.
    const isHardZone = (screenX === 1 && screenY === 2) || (screenX === 0 && screenY === 0);
    const count = isHardZone ? 4 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2);

    const enemyTypes = ["slime", "skeleton", "bat"];
    if (isHardZone) enemyTypes.push("skeleton"); // bias skeletons in hard zones

    for (let i = 0; i < count; i++) {
      const type = enemyTypes[Math.floor(rand() * enemyTypes.length)];
      let width = 24, height = 24, hp = 30, speed = 1.2, damage = 8, pointsValue = 10;

      if (type === "skeleton") {
        hp = 60;
        speed = 1.0;
        damage = 15;
        pointsValue = 25;
        width = 24;
        height = 28;
      } else if (type === "bat") {
        hp = 20;
        speed = 2.0;
        damage = 8;
        pointsValue = 15;
        width = 20;
        height = 20;
      }

      // Find a safe walkable tile to spawn the enemy
      let sx = 100, sy = 100;
      for (let attempt = 0; attempt < 20; attempt++) {
        sx = Math.floor(rand() * (SCREEN_WIDTH - 64)) + 32;
        sy = Math.floor(rand() * (SCREEN_HEIGHT - 64)) + 32;
        // Make sure it doesn't spawn right on top of the player!
        const playerDistX = Math.abs(sx - state.player.x);
        const playerDistY = Math.abs(sy - state.player.y);
        if (!isColliding(sx, sy, width, height, screenX, screenY) && (playerDistX > 100 || playerDistY > 100)) {
          break;
        }
      }

      state.enemies.push({
        id: `enemy_${screenX}_${screenY}_${i}`,
        type,
        x: sx,
        y: sy,
        width,
        height,
        hp,
        maxHp: hp,
        speed,
        damage,
        pointsValue,
        hurtCooldown: 0,
        facing: "down",
      });
    }
  }

  // Player action: move
  function movePlayer(state, dx, dy) {
    if (state.isGameOver || state.isVictory || state.currentDialogue || state.screenTransition) {
      return;
    }

    const p = state.player;

    // Set facing direction
    if (dx > 0) p.facing = "right";
    else if (dx < 0) p.facing = "left";
    else if (dy > 0) p.facing = "down";
    else if (dy < 0) p.facing = "up";

    if (dx === 0 && dy === 0) return;

    // Calculate move step
    const stepX = dx * p.speed;
    const stepY = dy * p.speed;

    // Try moving X then Y independently to slide along obstacles smoothly
    if (stepX !== 0) {
      const nextX = p.x + stepX;
      // Screen transition bounds ignore obstacle checks on borders
      const isLeavingX = nextX < 0 || nextX + p.width > SCREEN_WIDTH;
      if (isLeavingX || !isColliding(nextX, p.y, p.width, p.height, p.screenX, p.screenY)) {
        p.x = nextX;
      }
    }

    if (stepY !== 0) {
      const nextY = p.y + stepY;
      const isLeavingY = nextY < 0 || nextY + p.height > SCREEN_HEIGHT;
      if (isLeavingY || !isColliding(p.x, nextY, p.width, p.height, p.screenX, p.screenY)) {
        p.y = nextY;
      }
    }

    // Check for screen transitions
    checkScreenTransition(state);
  }

  // Check and trigger screen transition
  function checkScreenTransition(state) {
    const p = state.player;
    let nextSX = p.screenX;
    let nextSY = p.screenY;
    let newX = p.x;
    let newY = p.y;
    let direction = "";

    // West transition
    if (p.x < 4 && p.screenX > 0) {
      nextSX--;
      newX = SCREEN_WIDTH - p.width - 12;
      direction = "left";
    }
    // East transition
    else if (p.x > SCREEN_WIDTH - p.width - 4 && p.screenX < WORLD_WIDTH - 1) {
      nextSX++;
      newX = 12;
      direction = "right";
    }
    // North transition
    else if (p.y < 4 && p.screenY > 0) {
      nextSY--;
      newY = SCREEN_HEIGHT - p.height - 12;
      direction = "up";
    }
    // South transition
    else if (p.y > SCREEN_HEIGHT - p.height - 4 && p.screenY < WORLD_HEIGHT - 1) {
      nextSY++;
      newY = 12;
      direction = "down";
    }

    if (nextSX !== p.screenX || nextSY !== p.screenY) {
      state.screenTransition = {
        fromX: p.screenX,
        fromY: p.screenY,
        toX: nextSX,
        toY: nextSY,
        targetPlayerX: newX,
        targetPlayerY: newY,
        progress: 0, // 0 to 1
        direction,
      };

      // Set new coordinate triggers
      p.screenX = nextSX;
      p.screenY = nextSY;
      p.x = newX;
      p.y = newY;

      // Close dialogues
      state.currentDialogue = null;
    }
  }

  // Finalize transition
  function completeScreenTransition(state) {
    if (!state.screenTransition) return;
    state.screenTransition = null;
    spawnEnemies(state, state.player.screenX, state.player.screenY);
  }

  // Attack trigger
  function playerAttack(state) {
    if (state.isGameOver || state.isVictory || state.currentDialogue || state.screenTransition) {
      return false;
    }

    const p = state.player;
    if (p.attackCooldown > 0) return false;

    p.isAttacking = true;
    p.attackCooldown = 15; // Attack cooldown frames

    // Determine sword bounding box
    let sx = p.x, sy = p.y, sw = 24, sh = 24;
    const reach = 26;

    if (p.facing === "up") {
      sx = p.x - 4;
      sy = p.y - reach;
      sw = p.width + 8;
      sh = reach;
    } else if (p.facing === "down") {
      sx = p.x - 4;
      sy = p.y + p.height;
      sw = p.width + 8;
      sh = reach;
    } else if (p.facing === "left") {
      sx = p.x - reach;
      sy = p.y - 4;
      sw = reach;
      sh = p.height + 8;
    } else if (p.facing === "right") {
      sx = p.x + p.width;
      sy = p.y - 4;
      sw = reach;
      sh = p.height + 8;
    }

    p.activeSwordSweep = { x: sx, y: sy, width: sw, height: sh, timer: 10 };

    // Check hit on enemies
    state.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      const hitBox = p.activeSwordSweep;
      if (rectOverlap(hitBox, enemy)) {
        enemy.hp -= p.damage;
        enemy.hurtCooldown = 12;

        // Knockback enemy slightly away from player facing
        const knock = 20;
        if (p.facing === "up") enemy.y = Math.max(16, enemy.y - knock);
        else if (p.facing === "down") enemy.y = Math.min(SCREEN_HEIGHT - 16 - enemy.height, enemy.y + knock);
        else if (p.facing === "left") enemy.x = Math.max(16, enemy.x - knock);
        else if (p.facing === "right") enemy.x = Math.min(SCREEN_WIDTH - 16 - enemy.width, enemy.x + knock);

        // Earn points if enemy is defeated
        if (enemy.hp <= 0) {
          p.points += enemy.pointsValue;
          if (enemy.type === "boss") {
            state.isVictory = true;
          }
        }
      }
    });

    return true; // Swing successful
  }

  // Interact with NPC
  function interactWithNPC(state) {
    if (state.isGameOver || state.isVictory || state.screenTransition) return false;

    // If currently talking, exit dialogue
    if (state.currentDialogue) {
      state.currentDialogue = null;
      return true;
    }

    const p = state.player;

    // Check if player is near any NPC
    const interactionRange = 40;
    const centerPlayer = { x: p.x + p.width / 2, y: p.y + p.height / 2 };

    const nearbyNPC = NPCS.find((npc) => {
      if (npc.screenX !== p.screenX || npc.screenY !== p.screenY) return false;
      const npcX = npc.tx * TILE_SIZE + TILE_SIZE / 2;
      const npcY = npc.ty * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.hypot(centerPlayer.x - npcX, centerPlayer.y - npcY);
      return dist <= interactionRange;
    });

    if (nearbyNPC) {
      let options = [];
      if (nearbyNPC.id !== "elder" && nearbyNPC.level < nearbyNPC.maxLevel) {
        options.push({
          text: `Buy Upgrade [${nearbyNPC.cost} pts]`,
          action: "buy",
        });
      }

      state.currentDialogue = {
        npcId: nearbyNPC.id,
        name: nearbyNPC.name,
        text: nearbyNPC.dialogue,
        options,
      };
      return true;
    }

    return false;
  }

  // Purchase NPC upgrade
  function buyUpgrade(state) {
    if (!state.currentDialogue) return false;
    const diag = state.currentDialogue;
    const p = state.player;
    const npc = NPCS.find((n) => n.id === diag.npcId);

    if (!npc || npc.id === "elder") return false;

    if (npc.level >= npc.maxLevel) {
      diag.text = "You've reached maximum level of this upgrade!";
      diag.options = [];
      return false;
    }

    if (p.points < npc.cost) {
      diag.text = `Insufficent points! You need ${npc.cost} points for this upgrade.`;
      return false;
    }

    // Deduct points & apply upgrade
    p.points -= npc.cost;
    npc.level++;

    if (npc.id === "blacksmith") {
      p.damage += 15;
      npc.cost = 50 + npc.level * 25; // Increase next cost
      diag.text = `Excellent! Your Attack Damage is now ${p.damage}!`;
    } else if (npc.id === "healer") {
      p.maxHp += 25;
      p.hp = p.maxHp; // Heal fully
      npc.cost = 30 + npc.level * 15;
      diag.text = `You feel energized! Your Max HP is now ${p.maxHp} and health is fully restored!`;
    } else if (npc.id === "wizard") {
      p.speed += 0.8;
      npc.cost = 40 + npc.level * 20;
      diag.text = `Agility granted! Your movement speed is now ${p.speed.toFixed(1)}!`;
    } else if (npc.id === "shieldmaker") {
      p.shield += 4;
      npc.cost = 60 + npc.level * 30;
      diag.text = `Sturdy shield! You now block ${p.shield} damage from every attack!`;
    }

    // Refresh option
    if (npc.level < npc.maxLevel) {
      diag.options = [{ text: `Buy Upgrade [${npc.cost} pts]`, action: "buy" }];
    } else {
      diag.text += " (MAX LEVEL)";
      diag.options = [];
    }

    return true; // Success
  }

  // Game tick: update engine
  function update(state) {
    if (state.isGameOver || state.isVictory) return;

    const p = state.player;

    // Handle screen transition animation ticking in app.js.
    // Core only ticks logic if transition is not active.
    if (state.screenTransition) {
      state.screenTransition.progress += 0.05;
      if (state.screenTransition.progress >= 1.0) {
        completeScreenTransition(state);
      }
      return;
    }

    // Decrement player cooldowns
    if (p.attackCooldown > 0) p.attackCooldown--;
    if (p.attackCooldown === 0) p.isAttacking = false;
    if (p.hurtCooldown > 0) p.hurtCooldown--;

    if (p.activeSwordSweep) {
      p.activeSwordSweep.timer--;
      if (p.activeSwordSweep.timer <= 0) p.activeSwordSweep = null;
    }

    // Update active projectiles (from boss)
    state.activeProjectiles.forEach((proj, index) => {
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Projectile hit player
      const projBox = { x: proj.x - 6, y: proj.y - 6, width: 12, height: 12 };
      if (rectOverlap(projBox, p)) {
        if (p.hurtCooldown <= 0) {
          const actualDamage = Math.max(2, proj.damage - p.shield);
          p.hp -= actualDamage;
          p.hurtCooldown = 30;
          if (p.hp <= 0) {
            p.hp = 0;
            state.isGameOver = true;
          }
        }
        state.activeProjectiles.splice(index, 1);
        return;
      }

      // Out of bounds or hit obstacle
      const tile = getTileAt(proj.x, proj.y, p.screenX, p.screenY);
      if (isSolidTile(tile) || proj.x < 0 || proj.x > SCREEN_WIDTH || proj.y < 0 || proj.y > SCREEN_HEIGHT) {
        state.activeProjectiles.splice(index, 1);
      }
    });

    // Update enemies on screen
    state.enemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;

      if (enemy.hurtCooldown > 0) enemy.hurtCooldown--;

      // Simple AI: Move toward player
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      // Only follow player if they are nearby, or always for bats and boss
      const followRange = enemy.type === "bat" || enemy.type === "boss" ? 500 : 200;
      if (dist < followRange && dist > 2) {
        const vx = (dx / dist) * enemy.speed;
        const vy = (dy / dist) * enemy.speed;

        // Try movement, checking collisions with tiles on the current screen
        const nextX = enemy.x + vx;
        if (!isColliding(nextX, enemy.y, enemy.width, enemy.height, p.screenX, p.screenY)) {
          enemy.x = nextX;
        }

        const nextY = enemy.y + vy;
        if (!isColliding(enemy.x, nextY, enemy.width, enemy.height, p.screenX, p.screenY)) {
          enemy.y = nextY;
        }

        if (vx > 0) enemy.facing = "right";
        else if (vx < 0) enemy.facing = "left";
      }

      // Boss shoot fireballs
      if (enemy.type === "boss") {
        if (enemy.shootCooldown > 0) {
          enemy.shootCooldown--;
        } else {
          // Shoot in 4 diagonal directions or straight to player
          const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
          const playerAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
          
          // Shoot a fireball towards the player
          state.activeProjectiles.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: Math.cos(playerAngle) * 4,
            vy: Math.sin(playerAngle) * 4,
            damage: 20,
          });

          // Also shoot some scatter fireballs if boss is low health
          if (enemy.hp < 150) {
            angles.forEach((ang) => {
              state.activeProjectiles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(ang + playerAngle) * 3.5,
                vy: Math.sin(ang + playerAngle) * 3.5,
                damage: 15,
              });
            });
          }

          enemy.shootCooldown = 60 + Math.floor(Math.random() * 40); // frames between shots
        }
      }

      // Check damage to player on touch
      if (rectOverlap(p, enemy)) {
        if (p.hurtCooldown <= 0) {
          const actualDamage = Math.max(1, enemy.damage - p.shield);
          p.hp -= actualDamage;
          p.hurtCooldown = 30; // Player invincibility frames

          if (p.hp <= 0) {
            p.hp = 0;
            state.isGameOver = true;
          }
        }
      }
    });

    // Remove dead enemies
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  }

  return {
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    TILE_SIZE,
    COLS,
    ROWS,
    TILES,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    NPCS,
    mapData,
    createState,
    getTileAt,
    isSolidTile,
    isColliding,
    rectOverlap,
    spawnEnemies,
    movePlayer,
    playerAttack,
    interactWithNPC,
    buyUpgrade,
    update,
  };
});
