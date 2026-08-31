# Client-Side Game Architecture Spec (AIDEN_GAMES_ARCHITECTURE.md)

This document establishes the architecture standard for client-side web games in Aiden's portfolio. All games must adhere to these structural, rendering, and testing principles to ensure maximum performance, zero-dependency maintenance, and 100% automated test coverage.

---

## 1. Separation of Concerns (State vs. Presentation)

The game codebase must be strictly divided into two layers:

1. **Game Core (`game-core.js`):**
   - **Pure State Machine:** Manages the mathematical state of the game (player positions, health, speeds, grid coordinates, maps, NPC details, score, active enemies, collision boxes).
   - **Environment Agnostic:** Must have **zero DOM, zero Window, zero Document, and zero Canvas dependencies**.
   - **Module Format:** Universal Module Definition (UMD) so it can be loaded natively in Node.js (for high-speed testing via `node --test`) and directly in the browser via `<script>` or standard imports.
   - **Deterministic & Injectable:** All physics, movement, and collision updates must be deterministic, allowing mock delta times and positions to be tested.

2. **Game Renderer (`app.js`):**
   - **User Interface & Events:** Binds to the DOM, listens to key inputs (arrow keys, space, WASD), and manages the canvas.
   - **Procedural Rendering:** Draws tiles, players, and enemies onto the `<canvas>` using 2D context paths, shapes, and gradients, creating retro-style pixel art.
   - **Procedural Sound Engine:** Synthesizes sound effects (SFX) and background music (BGM) programmatically via the **Web Audio API**. This prevents broken assets, asset loading delays, and CORS issues entirely.
   - **Main Loop:** Uses `requestAnimationFrame` to poll keys, step the core engine, and render.

---

## 2. Screen Grid & Camera Transitions

For Zelda-style, multi-screen screen transitions:

- **World Map Grid:** The world is mapped as a 2D grid of screen coordinates: `(screenX, screenY)`.
- **Screen Coordinate System:** Each individual screen is represented by a 2D tile-grid (e.g., `20 columns x 15 rows`).
- **Edge Triggers:** When the player's core hitbox crosses the bounding boundary of the current screen:
  1. The Core registers the screen change and shifts the player's coordinate to the opposite edge of the adjacent screen.
  2. The Renderer locks player input, initiates a smooth **camera sliding transition animation** from the old screen to the new screen, and unlocks input upon animation completion.

---

## 3. High-Fidelity Retro Sound Engine

- **Background Music (BGM):** Programmatic chip-tune melodies using Web Audio API oscillators (`square`, `triangle`, `sawtooth`) and gain nodes.
- **Sound Effects (SFX):** Fast procedural synth bleeps and noise bursts triggered instantly upon player actions (e.g., attacking, hurt, trading, transitioning).
- **Safety Rule:** All Audio Context initializations must be deferred until the user's first interactive input (click/tap) to satisfy modern browser security restrictions.

---

## 4. CI/CD & Deploy Standards

- **Static Front-end Hosting:** All client-side games are deployed via GitHub Pages or simple static hosting (Tier 1 acceptable use).
- **Deployment Automation:** Every repository includes `.github/workflows/deploy.yml` which triggers on pushes to the `main` branch.
- **Quality Gates:** The deployment workflow MUST run `npm test` (`node --test`) prior to building, ensuring zero regressions are pushed to production.
- **DNS Provisioning:** Coordinate with **Geordi** to provision dynamic domain routing under `*.dalesackrider.com`.
