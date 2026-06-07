# SOUK BRAWL — شجار السوق

A Moroccan-themed 2D arcade fighting game built with vanilla JavaScript, HTML5, and CSS3. Created as a school project.

&gt; **"Street fighting, Maghreb style."**

---

## Preview

![SOUK BRAWL Screenshot](assets/stages/Screenshot.png)

---

## How to Run

No build step, no dependencies, no server required.

```bash
# Clone or download the repo, then simply:
open index.html````

## CONTROLS
Player 1 (Left Side)
Table
Action Key
Move Left ← Arrow
Move Right → Arrow
Jump ↑ Arrow
Crouch ↓ Arrow
Punch Z
Kick X
Block C
Special V
Pause ESC

Player 2 (Right Side)
Table
Action Key
Move Left J
Move Right L
Jump I
Crouch M
Punch U
Kick P
Block K
Special O

## Game Modes

    Arcade — Fight through AI opponents
    Versus — 2-player local battle
    Training — Practice combos against a dummy
    Story — 6-chapter narrative campaign (WIP)
    Survival — Endless waves, one health bar (WIP)

## Tech Stack

    Vanilla JavaScript (ES6+ Classes, no frameworks)
    HTML5 (Canvas for background effects, DOM for UI)
    CSS3 (Responsive layout, pixel-art styling, animations)
    No external libraries — 100% hand-written game engine

## Project Structure
js-school-project/
├── index.html          # Main menu
├── fight.html          # Core fight screen
├── versus.html         # 2-player character select
├── arcade.html         # Arcade mode menu
├── training.html       # Training dojo
├── story.html          # Story mode chapters
├── survival.html       # Survival mode rules
├── options.html        # Settings screen
├── css/
│   └── style.css       # All game styling
├── js/
│   ├── config.js       # Game constants & settings
│   ├── character.js    # Character roster & data
│   ├── fight.js        # Fight engine & state machine
│   ├── input.js        # Keyboard input handling
│   ├── background.js   # Canvas background animations
│   ├── menu.js         # Menu navigation logic
│   ├── utils.js        # Helper functions
│   └── main.js         # Entry point
└── assets/
    ├── characters/     # Fighter sprites (idle, walk, punch, etc.)
    └── stages/         # Stage backgrounds

## Features Implemented

    [x] Real-time fight engine with state machine (idle, walk, jump, punch, kick, block, hit, KO)
    [x] Hit detection with startup/active/recovery frames
    [x] Combo system with damage scaling
    [x] Health bars, super meter, round timer, win tracking
    [x] 3 fully playable characters with unique stats
    [x] Bilingual UI (English + Arabic)
    [x] AI opponent with blocking, movement, and attack logic
    [x] Pause menu with resume / restart
    [x] Responsive CSS layout
## Work In Progress

    [ ] Story mode gameplay (chapters 2–6)
    [ ] Survival mode wave engine
    [ ] Audio / SFX
    [ ] Additional stages
    [ ] Super move activation when meter is full
    [ ] Mobile / touch controls
## Autor
NyxieLucy — Student Developer
