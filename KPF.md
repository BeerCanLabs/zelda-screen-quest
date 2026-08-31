# Key Product Flows (KPF.md)

This document maps all user-facing capabilities of **Zelda Screen Quest** to their entry points, failure impacts, and associated automated test files.

---

## 1. Player Screen-to-Screen Movement & Boundary Transition
- **Description:** When the player reaches the edge of a screen, the game smoothly transitions to the adjacent screen. The player is placed at the opposite edge of the new screen, and the camera translates smoothly to center on the new screen.
- **Entry points:** 
  - State logic: `game-core.js::movePlayer()` and `game-core.js::checkScreenTransition()`
  - Rendering: `app.js::draw()` (camera sliding interpolation loop)
- **If it silently breaks:** The player gets stuck at the screen boundaries, walks out of bounds into the invisible void, or screens change instantly without any visual sliding transition.
- **Test status:** Automated (test/game-core.test.js::"KPF 1: player transitions to adjacent screen when hitting boundaries")

## 2. Combat Zone & Enemy Engagement
- **Description:** When entering combat screens (wilderness, mountain, ruins), monsters (Slimes, Skeletons, Bats) spawn and move toward the player. The player can press Spacebar/Enter to swing their sword. Dealing damage reduces monster HP, and defeating monsters awards points.
- **Entry points:**
  - Logic: `game-core.js::updateEnemies()`, `game-core.js::playerAttack()`
  - Rendering: `app.js::drawSwordSwing()`
- **If it silently breaks:** Monsters fail to spawn, do not move, become invincible, or do not award points upon defeat.
- **Test status:** Automated (test/game-core.test.js::"KPF 2: player can attack enemies and earn points on defeat")

## 3. Peaceful Zones & Point Upgrades Trading
- **Description:** Non-combat zones (villages) do not spawn enemies. They contain friendly NPCs (Elder, Blacksmith, Healer, Wizard). The player can walk up to an NPC, press 'E' or interact, open a dialogue overlay, and spend points to trade up their stats (e.g., Attack Damage, Max HP, Speed).
- **Entry points:**
  - Logic: `game-core.js::interactWithNPC()`, `game-core.js::buyUpgrade()`
  - Rendering: `app.js::drawNPCMenu()`
- **If it silently breaks:** Enemies spawn inside villages, NPCs are unresponsive, player stats do not increase, or upgrades can be purchased for free without sufficient points.
- **Test status:** Automated (test/game-core.test.js::"KPF 3: player can trade points for stat upgrades in villages")

## 4. Web Audio Retro Synth & Volume Control
- **Description:** Programmatic 8-bit chip-tune background music plays dynamically across screens (calm in villages, adventurous in combat zones). Retro SFX play for sword swinging, enemy hit, player hurt, screen transitions, and upgrades. A HUD volume button allows toggling audio.
- **Entry points:**
  - Logic: `app.js::initAudio()`, `app.js::playSFX()`, `app.js::playBGM()`
- **If it silently breaks:** The game is silent, audio context blocks execution, or sound effects stack and distort/crack.
- **Test status:** Manual (Tested across Chrome/Safari/Firefox for browser Web Audio capability; automated mock checks in test/game-core.test.js for audio flag state)

## 5. Boss Fight & Victory State
- **Description:** The bottom-right screen (2,2) houses the Dragon's Lair. Entering this screen spawns the Boss Dragon. The Dragon has high health and projectile/area attacks. Defeating the Dragon sets the game state to victory, triggering a victory screen.
- **Entry points:**
  - Logic: `game-core.js::updateBoss()`, `game-core.js::checkVictory()`
  - Rendering: `app.js::drawVictoryScreen()`
- **If it silently breaks:** The boss does not spawn, defeating the boss does not end the game, or the victory screen fails to display.
- **Test status:** Automated (test/game-core.test.js::"KPF 5: defeating the dragon boss triggers victory state")

## 6. Persistent Game Save State Export & Import
- **Description:** Game state (HP, maxHP, damage, speed, shield, points, screen coordinates, unlocked upgrades) is serialized and deserialized cleanly without DOM dependencies, supporting continuous session persistence across GCP deployments.
- **Entry points:**
  - Logic: `game-core.js::exportSaveState()`, `game-core.js::importSaveState()`
  - Client UI: `app.js::saveCloudState()`, `app.js::loadCloudState()`
- **If it silently breaks:** Saved state drops attributes, resets progress to defaults, or corrupts player position when reloading across screens.
- **Test status:** Automated (test/game-core.test.js::"KPF 6: exportSaveState and importSaveState preserve player progression across GCP sessions")

## 7. GCP Cloud Run REST API Persistence & Health check
- **Description:** Containerized Node.js service running on GCP Cloud Run (Port 8080) providing `/api/v1/health`, `/api/v1/auth/session`, and `/api/v1/player/state` REST API endpoints for persistent state storage.
- **Entry points:**
  - Server: `server.js` (HTTP REST API router + CORS + persistent file/memory store)
  - Containerization: `Dockerfile`, `cloudbuild.yaml`
- **If it silently breaks:** The container crashes on Cloud Run, CORS blocks client requests from GitHub Pages, or save payloads fail to write.
- **Test status:** Automated (test/api.test.js::"KPF 7: GCP Cloud Run healthcheck endpoint returns 200 OK and Tier 2 spec", "KPF 7: saving and loading player state via REST API persists data")

