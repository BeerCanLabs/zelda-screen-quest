# Zelda Screen Quest

**Zelda Screen Quest** is a classic, browser-based action-adventure game built with pure procedural HTML5 Canvas rendering and programmatically synthesized Web Audio API 8-bit chip-tunes. 

This repository conforms strictly to the **BeerCanLabs Contributor Standards**, utilizing:
- Decoupled game state architecture for 100% test coverage.
- Fully synchronized Key Product Flows (`KPF.md`).
- Authorized software deployment patterns (`.draft/sdp.yaml`).
- Automated CI/CD gates validating tests prior to live deployment.

---

## 🕹️ Controls

- **Arrow Keys / WASD** — Move Aiden smoothly around the screens.
- **Spacebar / Enter** — Swing your sword to strike monsters!
- **E Key** — Interact with friendly NPCs in villages or purchase upgrades.
- **M Key** (or HUD Speaker button) — Toggle music and sound effects on/off.

---

## 🗺️ World Grid Map

The world is designed as a `3x3` screen grid. The central Starting Village is fully safe, while the surrounding screens are hazardous combat zones.

```text
       [0,0] Mountain Pass  ───  [1,0] Haunted Woods  ───  [2,0] Desert Ruins
               │                        │                        │
       [0,1] Green Meadow   ───  [1,1] START VILLAGE  ───  [2,1] Eastern Forest
               │                        │                        │
     [0,2] Lakeside Village ───  [1,2] Swamp of Shadows ──  [2,2] DRAGON'S LAIR (Boss)
```

- **Starting Village (1,1):** Safe zone. Speak with the **Elder** for directions, or trade points with the **Blacksmith** (+Atk), **Healer** (+Max HP/Heal), or **Wizard** (+Speed) to grow stronger!
- **Lakeside Village (0,2):** Safe zone. Meet the **Shield Smith** to trade points for damage-blocking shields.
- **Dragon's Lair (2,2):** The ultimate zone. Face the massive fire-breathing Dragon Boss! Defeat it to win the game.

---

## 🛠️ Architecture Specification

The codebase is engineered based on the **Separation of Concerns (SoC)** design pattern, dividing rendering from pure mathematical engine state:

```text
                  +───────────────────────────────+
                  │    User Interaction (DOM)     │
                  +───────────────┬───────────────+
                                  │
                                  ▼
                  +───────────────────────────────+
                  │     Game Renderer (app.js)    │
                  +──────┬─────────────────┬──────+
                         │                 │
                         ▼                 ▼
  +─────────────────────────────+   +─────────────────────────────+
  │    Procedural Canvas 2D     │   │   Audio Synth (Web Audio)   │
  │   (Pixel-art drawing,       │   │  (Oscillators, Gains, BGM)  │
  │    camera screen sliding)   │   │                             │
  +─────────────────────────────+   +─────────────────────────────+
                         │                 ▲
                         │ Polling         │ Triggers SFX & Loops BGM
                         ▼                 │
                  +────────────────────────┴──────+
                  │      Game Core (game-core.js) │ <─── Tested via Node Runner
                  │  (State, positions, collisions)│      (100% environment-free)
                  +───────────────────────────────+
```

1. **`game-core.js` (The State Machine):**
   Holds all core state (HP, damage, positions, active enemies, collision boxes). It has **no references to DOM, window, document, or canvas**. It runs anywhere and is imported by both the browser (global context) and the Node.js test runner (`module.exports`).
2. **`app.js` (The Presentation Layer):**
   Handles the frame loop (`requestAnimationFrame`), keyboard event listening, 2D Canvas drawing (using vector paths to draw custom pixel art programmatically), and Web Audio API note-scheduling oscillators to generate retro sound effects and background melodies.

---

## 🧪 Testing & Validation

Since the state machine has zero browser-dependencies, unit tests execute instantly in Node.js with maximum reliability.

To run the unit tests locally:
```bash
npm test
```

Unit tests validate all user-facing **Key Product Flows** (KPFs):
1. **Screen boundary transition triggers:** Moving player off-screen updates coordinates and initiates a sliding camera viewport.
2. **Combat mechanics:** Swinging swords registers box-collisions, deducts HP from enemies, applies backward knockback, and awards points on defeat.
3. **NPC upgrades:** Purchasing upgrades deducts points, levels up attributes (ATK, HP, DEF, SPD), and enforces boundary conditions.
4. **Victory condition:** Defeating the massive dragon boss successfully triggers the game victory state.

---

## 🚀 CI/CD & Hosting

- **Substrate:** Host client-only assets directly via **GitHub Pages**.
- **Pipeline:** Every push to `main` executes `.github/workflows/deploy.yml` which:
  1. Installs Node.js.
  2. Runs `npm test` (`node --test`) to verify quality standards.
  3. Deploys the static assets directly to Pages if all tests pass.
