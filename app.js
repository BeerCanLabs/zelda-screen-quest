/*
 * Zelda Screen Quest — app.js
 *
 * Handles the browser rendering loop, input, canvas drawing,
 * and procedural Web Audio API synthesizer music and SFX.
 */

// Global Game instances
let state;
let keys = {};
let audioCtx = null;
let bgmTimer = null;
let musicEnabled = true;
let currentBgmZone = ""; // "town" or "wilderness" or "boss"

// DOM Elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const gameoverScreen = document.getElementById("gameover-screen");
const restartBtn = document.getElementById("restart-btn");
const victoryScreen = document.getElementById("victory-screen");
const playAgainBtn = document.getElementById("play-again-btn");
const volumeBtn = document.getElementById("volume-btn");

const dialogueBox = document.getElementById("dialogue-box");
const npcNameSpan = document.getElementById("npc-name");
const npcTextP = document.getElementById("npc-text");
const npcOptionsDiv = document.getElementById("npc-options");

const hpBar = document.getElementById("hp-bar");
const hpText = document.getElementById("hp-text");
const pointsVal = document.getElementById("points-val");
const zoneName = document.getElementById("zone-name");
const statAtk = document.getElementById("stat-atk");
const statDef = document.getElementById("stat-def");
const statSpd = document.getElementById("stat-spd");

// Screen mapping coordinates to titles
const ZONE_NAMES = {
  "0,0": "Mountain Pass",
  "1,0": "Haunted Woods",
  "2,0": "Desert Ruins",
  "0,1": "Green Meadow",
  "1,1": "Starting Village",
  "2,1": "Eastern Forest",
  "0,2": "Lakeside Village",
  "1,2": "Swamp of Shadows",
  "2,2": "Dragon's Lair",
};

// ── Audio Synthesizer (Web Audio API) ────────────────────────────────────────

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  startBGM();
}

function toggleVolume() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    volumeBtn.innerText = "🔊 Sound On";
    if (audioCtx) {
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      startBGM();
    } else {
      initAudio();
    }
  } else {
    volumeBtn.innerText = "🔇 Sound Off";
    stopBGM();
  }
}

function stopBGM() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

// Synth a brief retro SFX on-the-fly
function playSFX(type) {
  if (!musicEnabled || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === "swing") {
    // High to low pitch sweep (sword swing)
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === "hit") {
    // Noise/Thump hit sound
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === "hurt") {
    // Vibrato warning pitch drop
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.25);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === "upgrade") {
    // Arpeggio rising scale (purchase upgrade)
    osc.type = "square";
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((f, i) => {
      const noteTime = now + i * 0.08;
      osc.frequency.setValueAtTime(f, noteTime);
    });
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === "transition") {
    // Soft low frequency wash
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

// Programmatic 8-bit chip-tune background music loop
function startBGM() {
  stopBGM();
  if (!musicEnabled || !audioCtx) return;

  let step = 0;

  // Simple melodies
  const townMelody = [
    261.63, 293.66, 329.63, 261.63, 329.63, 349.23, 392.00, 392.00,
    349.23, 329.63, 293.66, 261.63, 293.66, 329.63, 261.63, 261.63
  ]; // Friendly major C scale

  const adventureMelody = [
    220.00, 220.00, 246.94, 261.63, 293.66, 261.63, 246.94, 220.00,
    196.00, 196.00, 220.00, 246.94, 261.63, 246.94, 220.00, 196.00
  ]; // Adventurous minor A scale

  const bossMelody = [
    110.00, 110.00, 116.54, 110.00, 110.00, 123.47, 110.00, 130.81,
    146.83, 146.83, 138.59, 130.81, 123.47, 116.54, 110.00, 98.00
  ]; // Heavy sinister bass boss riff

  const noteDuration = 0.25; // tempo (quarter note = 250ms)

  bgmTimer = setInterval(() => {
    // Determine melody based on zone
    const isSafe = (state.player.screenX === 1 && state.player.screenY === 1) ||
                   (state.player.screenX === 0 && state.player.screenY === 2);
    const isBoss = (state.player.screenX === 2 && state.player.screenY === 2);

    let melody = adventureMelody;
    let oscType = "triangle";
    let vol = 0.05;

    if (isBoss) {
      melody = bossMelody;
      oscType = "sawtooth";
      vol = 0.08;
    } else if (isSafe) {
      melody = townMelody;
      oscType = "triangle";
      vol = 0.06;
    }

    const note = melody[step % melody.length];

    // Play main note
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = oscType;
    osc.frequency.setValueAtTime(note, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + noteDuration - 0.02);
    osc.start();
    osc.stop(audioCtx.currentTime + noteDuration - 0.01);

    // Play simple bass harmony on beat 1 & 3
    if (step % 2 === 0) {
      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(note / 2, audioCtx.currentTime);
      bassOsc.connect(bassGain);
      bassGain.connect(audioCtx.destination);
      bassGain.gain.setValueAtTime(vol * 1.5, audioCtx.currentTime);
      bassGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + noteDuration * 2 - 0.02);
      bassOsc.start();
      bassOsc.stop(audioCtx.currentTime + noteDuration * 2 - 0.01);
    }

    step++;
  }, noteDuration * 1000);
}

// ── Rendering & Drawing Functions ────────────────────────────────────────────

// Render a single screen's grid of tiles
function drawMap(screenX, screenY, offsetX = 0, offsetY = 0) {
  const mapKey = `${screenX},${screenY}`;
  const grid = ZeldaCore.mapData[mapKey];
  if (!grid) return;

  for (let r = 0; r < ZeldaCore.ROWS; r++) {
    for (let c = 0; c < ZeldaCore.COLS; c++) {
      const tileType = grid[r][c];
      const tx = c * ZeldaCore.TILE_SIZE + offsetX;
      const ty = r * ZeldaCore.TILE_SIZE + offsetY;

      // Render standard colors based on tile types
      if (tileType === ZeldaCore.TILES.GRASS) {
        // Light Green Grass
        ctx.fillStyle = "#48a048";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
        // Grass blades detailing
        ctx.fillStyle = "#388038";
        ctx.fillRect(tx + 8, ty + 12, 2, 8);
        ctx.fillRect(tx + 20, ty + 20, 2, 6);
      } else if (tileType === ZeldaCore.TILES.WALL) {
        // Dark Green Tree Wall or Rocks
        ctx.fillStyle = "#184818";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
        // Tree foliage border
        ctx.fillStyle = "#103010";
        ctx.fillRect(tx + 4, ty + 4, ZeldaCore.TILE_SIZE - 8, ZeldaCore.TILE_SIZE - 8);
        ctx.fillStyle = "#286828";
        ctx.fillRect(tx + 6, ty + 6, 8, 8);
      } else if (tileType === ZeldaCore.TILES.WATER) {
        // Blue Water
        ctx.fillStyle = "#2040c0";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
        // Waves
        ctx.fillStyle = "#4080f0";
        ctx.fillRect(tx + 4, ty + 8, 10, 2);
        ctx.fillRect(tx + 16, ty + 20, 8, 2);
      } else if (tileType === ZeldaCore.TILES.PATH) {
        // Dusty Path
        ctx.fillStyle = "#b88850";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
      } else if (tileType === ZeldaCore.TILES.HOUSE_WALL) {
        // Brown Wood Wall
        ctx.fillStyle = "#603010";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
        // Brick horizontal outlines
        ctx.fillStyle = "#402008";
        ctx.fillRect(tx, ty + 10, ZeldaCore.TILE_SIZE, 2);
        ctx.fillRect(tx, ty + 22, ZeldaCore.TILE_SIZE, 2);
      } else if (tileType === ZeldaCore.TILES.FLOOR) {
        // Grey Stone floor
        ctx.fillStyle = "#585860";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
        // Grid pattern
        ctx.strokeStyle = "#404048";
        ctx.strokeRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
      } else if (tileType === ZeldaCore.TILES.DOOR) {
        // Dark archway door
        ctx.fillStyle = "#281808";
        ctx.fillRect(tx, ty, ZeldaCore.TILE_SIZE, ZeldaCore.TILE_SIZE);
        ctx.fillStyle = "#906020";
        ctx.fillRect(tx + 6, ty + 2, ZeldaCore.TILE_SIZE - 12, ZeldaCore.TILE_SIZE - 2);
        ctx.fillStyle = "#101010";
        ctx.fillRect(tx + 10, ty + 8, 12, 16);
      }
    }
  }

  // Draw NPCs if on this screen
  ZeldaCore.NPCS.forEach((npc) => {
    if (npc.screenX !== screenX || npc.screenY !== screenY) return;
    const nx = npc.tx * ZeldaCore.TILE_SIZE + offsetX;
    const ny = npc.ty * ZeldaCore.TILE_SIZE + offsetY;

    // Draw NPC (different colors based on id)
    let bodyColor = "#f0a040"; // Elder orange
    if (npc.id === "blacksmith") bodyColor = "#707070"; // Blacksmith grey
    else if (npc.id === "healer") bodyColor = "#e53e3e"; // Healer red
    else if (npc.id === "wizard") bodyColor = "#a040f0"; // Wizard purple
    else if (npc.id === "shieldmaker") bodyColor = "#2b6cb0"; // Blue shieldmaker

    // Head
    ctx.fillStyle = "#ffdb99";
    ctx.fillRect(nx + 8, ny + 4, 16, 12);
    // Hair / Cap
    ctx.fillStyle = "#331a00";
    ctx.fillRect(nx + 6, ny + 2, 20, 4);
    // Robe/Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(nx + 6, ny + 16, 20, 16);
    // Eyes
    ctx.fillStyle = "#000";
    ctx.fillRect(nx + 11, ny + 8, 2, 2);
    ctx.fillRect(nx + 19, ny + 8, 2, 2);
  });
}

// Draw the Player (Aiden in retro green tunic)
function drawPlayer(p, offsetX = 0, offsetY = 0) {
  const px = p.x + offsetX;
  const py = p.y + offsetY;

  // Hurt flicker
  if (p.hurtCooldown > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
    return; // skip drawing this frame to flicker
  }

  // Cap/Hair
  ctx.fillStyle = "#207020"; // Green Hat
  ctx.fillRect(px + 3, py, 16, 6);
  ctx.fillStyle = "#3a1d00"; // Hair
  ctx.fillRect(px + 4, py + 5, 14, 4);

  // Face
  ctx.fillStyle = "#ffdb99"; // Skin
  ctx.fillRect(px + 4, py + 8, 14, 8);

  // Eyes (look direction based on facing)
  ctx.fillStyle = "#000";
  if (p.facing === "down") {
    ctx.fillRect(px + 7, py + 11, 2, 2);
    ctx.fillRect(px + 13, py + 11, 2, 2);
  } else if (p.facing === "up") {
    // No eyes seen from behind
  } else if (p.facing === "left") {
    ctx.fillRect(px + 5, py + 11, 2, 2);
    ctx.fillRect(px + 10, py + 11, 2, 2);
  } else if (p.facing === "right") {
    ctx.fillRect(px + 10, py + 11, 2, 2);
    ctx.fillRect(px + 15, py + 11, 2, 2);
  }

  // Tunic Body
  ctx.fillStyle = "#208820"; // Green Tunic
  ctx.fillRect(px + 3, py + 16, 16, 16);

  // Belt/Collar
  ctx.fillStyle = "#4a2500"; // Brown Belt
  ctx.fillRect(px + 3, py + 24, 16, 2);
  ctx.fillStyle = "#f3c23c"; // Gold buckle
  ctx.fillRect(px + 10, py + 23, 3, 4);

  // Boots
  ctx.fillStyle = "#331a00";
  ctx.fillRect(px + 4, py + 31, 5, 2);
  ctx.fillRect(px + 13, py + 31, 5, 2);

  // Shield
  if (p.shield > 0) {
    ctx.fillStyle = "#505060"; // Silver Metal
    if (p.facing === "left") {
      ctx.fillRect(px - 3, py + 14, 4, 12);
      ctx.fillStyle = "#1e3a8a"; // Blue center
      ctx.fillRect(px - 2, py + 16, 2, 8);
    } else if (p.facing === "right") {
      ctx.fillRect(px + 21, py + 14, 4, 12);
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(px + 22, py + 16, 2, 8);
    } else {
      // Facing up or down (drawn on side/arm)
      ctx.fillRect(px - 3, py + 15, 4, 10);
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(px - 2, py + 17, 2, 6);
    }
  }

  // Draw Sword Swing Sweep
  if (p.activeSwordSweep) {
    const sw = p.activeSwordSweep;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(sw.x + offsetX, sw.y + offsetY, sw.width, sw.height);
    // Draw blade edge line
    ctx.strokeStyle = "#4080ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(sw.x + offsetX, sw.y + offsetY, sw.width, sw.height);
  }
}

// Draw Enemies
function drawEnemies(enemies, offsetX = 0, offsetY = 0) {
  enemies.forEach((enemy) => {
    const ex = enemy.x + offsetX;
    const ey = enemy.y + offsetY;

    if (enemy.hp <= 0) return;

    // Enemy hurt flashing red
    if (enemy.hurtCooldown > 0 && Math.floor(Date.now() / 40) % 2 === 0) {
      ctx.fillStyle = "#e53e3e";
      ctx.fillRect(ex, ey, enemy.width, enemy.height);
      return;
    }

    if (enemy.type === "slime") {
      // Green gelatinous blob
      ctx.fillStyle = "#38a169";
      ctx.beginPath();
      ctx.ellipse(ex + 12, ey + 14, 12, 10, 0, 0, 2 * Math.PI);
      ctx.fill();

      // Slime eyes
      ctx.fillStyle = "#000";
      ctx.fillRect(ex + 7, ey + 10, 2, 2);
      ctx.fillRect(ex + 15, ey + 10, 2, 2);
    } else if (enemy.type === "skeleton") {
      // White bone soldier
      ctx.fillStyle = "#e2e8f0"; // Bone white
      // Skull
      ctx.fillRect(ex + 6, ey, 12, 10);
      // Eye sockets
      ctx.fillStyle = "#e53e3e"; // Red eyes
      ctx.fillRect(ex + 8, ey + 4, 2, 2);
      ctx.fillRect(ex + 14, ey + 4, 2, 2);
      // Ribcage
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(ex + 8, ey + 11, 8, 10);
      ctx.fillStyle = "#1a202c"; // Gaps
      ctx.fillRect(ex + 6, ey + 14, 12, 2);
      ctx.fillRect(ex + 6, ey + 18, 12, 2);
      // Legs
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(ex + 7, ey + 21, 3, 7);
      ctx.fillRect(ex + 14, ey + 21, 3, 7);
      // Bone sword
      ctx.fillStyle = "#cbd5e0";
      if (enemy.facing === "right" || enemy.facing === "down") {
        ctx.fillRect(ex + 18, ey + 8, 4, 12); // Sword
        ctx.fillStyle = "#4a5568"; // Hilt
        ctx.fillRect(ex + 16, ey + 14, 8, 2);
      } else {
        ctx.fillRect(ex - 2, ey + 8, 4, 12);
        ctx.fillStyle = "#4a5568";
        ctx.fillRect(ex - 4, ey + 14, 8, 2);
      }
    } else if (enemy.type === "bat") {
      // Flying black bat with flapping wings
      ctx.fillStyle = "#2d3748"; // Black body
      ctx.fillRect(ex + 6, ey + 6, 8, 8);
      // Eyes
      ctx.fillStyle = "#f3c23c"; // yellow eyes
      ctx.fillRect(ex + 8, ey + 8, 1, 1);
      ctx.fillRect(ex + 11, ey + 8, 1, 1);

      // Flapping wings
      const isWingUp = Math.floor(Date.now() / 150) % 2 === 0;
      ctx.fillStyle = "#1a202c";
      if (isWingUp) {
        ctx.fillRect(ex - 2, ey + 2, 8, 6); // Left wing
        ctx.fillRect(ex + 14, ey + 2, 8, 6); // Right wing
      } else {
        ctx.fillRect(ex - 2, ey + 8, 8, 6);
        ctx.fillRect(ex + 14, ey + 8, 8, 6);
      }
    } else if (enemy.type === "boss") {
      // Massive Red Boss Dragon!
      ctx.fillStyle = "#c53030"; // Dark dragon red
      // Large scaled body box
      ctx.fillRect(ex + 4, ey + 16, 56, 44);
      // Giant dragon head
      ctx.fillRect(ex + 12, ey, 40, 20);
      // Snout
      ctx.fillRect(ex + 16, ey + 16, 32, 10);
      // Glowing yellow slits
      ctx.fillStyle = "#ecc94b";
      ctx.fillRect(ex + 20, ey + 8, 4, 4);
      ctx.fillRect(ex + 40, ey + 8, 4, 4);
      // Sharp white fangs
      ctx.fillStyle = "#fff";
      ctx.fillRect(ex + 22, ey + 22, 3, 4);
      ctx.fillRect(ex + 39, ey + 22, 3, 4);

      // Tail
      ctx.fillStyle = "#9b2c2c";
      ctx.fillRect(ex - 12, ey + 36, 16, 12);

      // Flapping massive demonic wings
      const wingFlap = Math.floor(Date.now() / 200) % 2 === 0;
      ctx.fillStyle = "#4a1212";
      if (wingFlap) {
        ctx.fillRect(ex - 20, ey + 8, 24, 20); // Left wing
        ctx.fillRect(ex + 60, ey + 8, 24, 20); // Right wing
      } else {
        ctx.fillRect(ex - 20, ey + 24, 24, 20);
        ctx.fillRect(ex + 60, ey + 24, 24, 20);
      }

      // HP bar for boss drawn above head
      const barW = 60;
      const barH = 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(ex + 2, ey - 12, barW, barH);
      const hpPct = enemy.hp / enemy.maxHp;
      ctx.fillStyle = "#e53e3e";
      ctx.fillRect(ex + 2, ey - 12, barW * hpPct, barH);
    }
  });
}

// Draw Boss Projectiles (Fireballs)
function drawProjectiles(projectiles) {
  projectiles.forEach((proj) => {
    ctx.fillStyle = "#ed8936"; // Orange fireball
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Crackling yellow core
    ctx.fillStyle = "#f6e05e";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 3, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// Draw screen transition sliding animation
function drawScreenTransition(t) {
  const fromX = t.fromX;
  const fromY = t.fromY;
  const toX = t.toX;
  const toY = t.toY;
  const progress = t.progress;
  const dir = t.direction;

  let offsetFromX = 0, offsetFromY = 0;
  let offsetToX = 0, offsetToY = 0;

  if (dir === "right") {
    offsetFromX = -progress * ZeldaCore.SCREEN_WIDTH;
    offsetToX = ZeldaCore.SCREEN_WIDTH + offsetFromX;
  } else if (dir === "left") {
    offsetFromX = progress * ZeldaCore.SCREEN_WIDTH;
    offsetToX = -ZeldaCore.SCREEN_WIDTH + offsetFromX;
  } else if (dir === "down") {
    offsetFromY = -progress * ZeldaCore.SCREEN_HEIGHT;
    offsetToY = ZeldaCore.SCREEN_HEIGHT + offsetFromY;
  } else if (dir === "up") {
    offsetFromY = progress * ZeldaCore.SCREEN_HEIGHT;
    offsetToY = -ZeldaCore.SCREEN_HEIGHT + offsetFromY;
  }

  // Draw both maps offset on canvas
  drawMap(fromX, fromY, offsetFromX, offsetFromY);
  drawMap(toX, toY, offsetToX, offsetToY);

  // Draw player on the sliding coordinates
  // Interpolate player position between screens to make transition seamless
  const p = state.player;
  const px = p.x; // The core has already teleported to target coordinate
  const py = p.y;
  
  // Make the visual coordinate transition smoothly from edges
  let visX = px;
  let visY = py;

  if (dir === "right") {
    visX = px * progress + (0 - p.width) * (1 - progress);
  } else if (dir === "left") {
    visX = px * progress + (ZeldaCore.SCREEN_WIDTH) * (1 - progress);
  } else if (dir === "down") {
    visY = py * progress + (0 - p.height) * (1 - progress);
  } else if (dir === "up") {
    visY = py * progress + (ZeldaCore.SCREEN_HEIGHT) * (1 - progress);
  }

  drawPlayer(p, visX - px, visY - py);
}

// Update the DOM overlays and HTML HUD text
function updateHUD() {
  const p = state.player;

  // HP Bar & text
  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
  hpBar.style.width = `${hpPct}%`;
  hpText.innerText = `${p.hp}/${p.maxHp}`;

  // Score points
  pointsVal.innerText = p.points;

  // Zone Name
  const key = `${p.screenX},${p.screenY}`;
  zoneName.innerText = ZONE_NAMES[key] || "Wilds";

  // Upgrade dialogue sync
  if (state.currentDialogue) {
    dialogueBox.classList.remove("hidden");
    npcNameSpan.innerText = state.currentDialogue.name;
    npcTextP.innerText = state.currentDialogue.text;

    // Redraw action buttons inside dialogue
    npcOptionsDiv.innerHTML = "";
    state.currentDialogue.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "npc-btn";
      btn.innerText = opt.text;
      btn.addEventListener("click", () => {
        if (opt.action === "buy") {
          const success = ZeldaCore.buyUpgrade(state);
          if (success) {
            playSFX("upgrade");
          }
          updateHUD();
        }
      });
      npcOptionsDiv.appendChild(btn);
    });
  } else {
    dialogueBox.classList.add("hidden");
  }

  // Stats indicators
  statAtk.innerText = p.damage;
  statDef.innerText = p.shield;
  statSpd.innerText = p.speed.toFixed(1);

  // Overlays
  if (state.isGameOver) {
    gameoverScreen.classList.remove("hidden");
  } else {
    gameoverScreen.classList.add("hidden");
  }

  if (state.isVictory) {
    victoryScreen.classList.remove("hidden");
    document.getElementById("final-stats").innerHTML = `
      <p style="margin: 12px 0;">Final Score: <strong>${p.points} points</strong></p>
      <p style="font-size: 11px; color:#a0aec0;">ATK: ${p.damage} | DEF: ${p.shield} | SPD: ${p.speed.toFixed(1)}</p>
    `;
  } else {
    victoryScreen.classList.add("hidden");
  }

  // Dynamic BGM trigger when zone changes
  syncBGMZone();
}

function syncBGMZone() {
  if (!musicEnabled || !audioCtx) return;
  const p = state.player;
  const isSafe = (p.screenX === 1 && p.screenY === 1) || (p.screenX === 0 && p.screenY === 2);
  const isBoss = (p.screenX === 2 && p.screenY === 2);

  let newZone = "wilderness";
  if (isBoss) newZone = "boss";
  else if (isSafe) newZone = "town";

  if (currentBgmZone !== newZone) {
    currentBgmZone = newZone;
    startBGM(); // Transition to the new BGM zone immediately
  }
}

// Main Frame loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.screenTransition) {
    // Transitioning animation is currently playing
    drawScreenTransition(state.screenTransition);
  } else {
    // Draw Standard State
    const p = state.player;
    drawMap(p.screenX, p.screenY);
    drawProjectiles(state.activeProjectiles);
    drawEnemies(state.enemies);
    drawPlayer(p);
  }
}

// Key polling input movement update
function handleInput() {
  let dx = 0;
  let dy = 0;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx = -1;
  else if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx = 1;

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) dy = -1;
  else if (keys["ArrowDown"] || keys["s"] || keys["S"]) dy = 1;

  if (dx !== 0 || dy !== 0) {
    ZeldaCore.movePlayer(state, dx, dy);
  }
}

// Continuous Game tick
function gameLoop() {
  // Update state core ticks
  ZeldaCore.update(state);

  // Poll input movement
  handleInput();

  // Render Frame
  draw();

  // Update UI HUD Overlay
  updateHUD();

  // Next frame
  requestAnimationFrame(gameLoop);
}

// ── Bind Interactive Event Listeners ──────────────────────────────────────────

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  // Single hit triggers
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault(); // prevent scrolling
    const swung = ZeldaCore.playerAttack(state);
    if (swung) {
      playSFX("swing");
    }
  }

  if (e.key === "e" || e.key === "E") {
    e.preventDefault();
    const interacted = ZeldaCore.interactWithNPC(state);
    if (interacted) {
      playSFX("swing"); // simple tick sound
    }
  }

  if (e.key === "m" || e.key === "M") {
    toggleVolume();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

const cloudSaveBtn = document.getElementById("cloud-save-btn");
const cloudLoadBtn = document.getElementById("cloud-load-btn");
const cloudStatus = document.getElementById("cloud-status");

const API_BASE = window.location.origin.includes("github.io")
  ? "https://zelda-screen-quest-service-url.a.run.app"
  : "";

async function saveCloudState() {
  if (!state || !ZeldaCore.exportSaveState) return;
  const exported = ZeldaCore.exportSaveState(state);
  try {
    cloudStatus.innerText = "Saving to GCP...";
    const res = await fetch(`${API_BASE}/api/v1/player/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: "aiden-player-1", state: exported }),
    });
    const data = await res.json();
    if (data.success) {
      cloudStatus.innerText = "☁️ GCP Persistent!";
      setTimeout(() => {
        if (cloudStatus) cloudStatus.innerText = "GCP Tier 2";
      }, 3000);
    } else {
      cloudStatus.innerText = "Save Failed";
    }
  } catch (err) {
    console.warn("GCP Persistence API offline or unreachable:", err);
    cloudStatus.innerText = "Local Mode";
  }
}

async function loadCloudState() {
  if (!state || !ZeldaCore.importSaveState) return;
  try {
    cloudStatus.innerText = "Loading GCP state...";
    const res = await fetch(`${API_BASE}/api/v1/player/state?playerId=aiden-player-1`);
    const data = await res.json();
    if (data.success && data.state) {
      ZeldaCore.importSaveState(state, data.state);
      cloudStatus.innerText = "🔄 Loaded GCP State!";
      updateHUD();
      draw();
      setTimeout(() => {
        if (cloudStatus) cloudStatus.innerText = "GCP Tier 2";
      }, 3000);
    } else {
      cloudStatus.innerText = "No Save State";
    }
  } catch (err) {
    console.warn("GCP Persistence API offline or unreachable:", err);
    cloudStatus.innerText = "Local Mode";
  }
}

cloudSaveBtn.addEventListener("click", () => {
  saveCloudState();
});

cloudLoadBtn.addEventListener("click", () => {
  loadCloudState();
});

// Auto-save every 45 seconds during gameplay
setInterval(() => {
  if (state && !state.isGameOver && !state.isVictory) {
    saveCloudState();
  }
}, 45000);

startBtn.addEventListener("click", async () => {
  initAudio();
  startScreen.classList.add("hidden");
  state = ZeldaCore.createState();
  // Attempt to load existing GCP save state if available
  await loadCloudState();
  ZeldaCore.spawnEnemies(state, state.player.screenX, state.player.screenY);
  requestAnimationFrame(gameLoop);
});

restartBtn.addEventListener("click", () => {
  state = ZeldaCore.createState();
  ZeldaCore.spawnEnemies(state, state.player.screenX, state.player.screenY);
  syncBGMZone();
});

playAgainBtn.addEventListener("click", () => {
  state = ZeldaCore.createState();
  ZeldaCore.spawnEnemies(state, state.player.screenX, state.player.screenY);
  syncBGMZone();
});

volumeBtn.addEventListener("click", () => {
  toggleVolume();
});

// Initialize fresh state instantly for template display before start clicks
state = ZeldaCore.createState();
draw();

