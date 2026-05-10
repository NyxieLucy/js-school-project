// ═══════════════════════════════════════════════════════════
//  SOUK BRAWL — fight.js
//  Full fight engine: input, physics, hitboxes, AI, rounds
// ═══════════════════════════════════════════════════════════

'use strict';

// ─── Constants ───────────────────────────────────────────────
const STAGE_W   = 900;   // logical canvas width
const STAGE_H   = 420;   // logical canvas height
const GROUND_Y  = 340;   // y position of the ground (fighter feet)
const GRAVITY   = 0.65;
const JUMP_VY   = -14;
const WALL_L    = 40;
const WALL_R    = STAGE_W - 40;

const HP_MAX    = 100;
const SUPER_MAX = 100;
const SUPER_PER_HIT = 8;   // super gained when landing a hit
const SUPER_PER_RECV = 4;  // super gained when taking a hit (guts)
const BLOCK_CHIP = 0.15;   // blocked hits deal 15% chip damage

const ROUND_START_DELAY = 2000; // ms before "FIGHT!" fades
const KO_DISPLAY_TIME   = 2500;
const BETWEEN_ROUND     = 3000;

// AI reaction budgets per difficulty (frames to decide)
const AI_REACT = { easy: 45, normal: 28, hard: 14, legend: 6 };
const AI_AGGRESSION = { easy: 0.3, normal: 0.55, hard: 0.75, legend: 0.92 };

// ─── Game State ──────────────────────────────────────────────
let gameState = 'intro'; // intro | fighting | paused | round_end | game_end
let currentRound = 1;
let totalRounds  = 3;
let countdown    = 60;
let timerInterval = null;
let animFrameId   = null;
let frameCount    = 0;

// ─── Fighter class ───────────────────────────────────────────
class Fighter {
  constructor(cfg) {
    this.id       = cfg.id;
    this.charData = ROSTER.find(c => c.id === cfg.id) || ROSTER[0];
    this.side     = cfg.side; // 'left' | 'right'
    this.isAI     = cfg.isAI || false;

    // Position & physics
    this.x    = cfg.side === 'left' ? 160 : STAGE_W - 260;
    this.y    = GROUND_Y;
    this.vx   = 0;
    this.vy   = 0;
    this.facing = cfg.side === 'left' ? 1 : -1; // 1=right, -1=left

    // Stats derived from charData
    const spd = this.charData.stats.speed;
    const def = this.charData.stats.defense;
    this.walkSpeed   = 2.5 + spd * 0.35;
    this.defMult     = 1 - (def - 1) * 0.03; // 0.97 to 0.73

    // Combat state
    this.hp         = HP_MAX;
    this.superMeter = 0;
    this.wins       = 0;
    this.state      = 'idle'; // idle|walk|jump|punch|kick|block|special|hurt|ko
    this.actionFrame = 0;     // frames remaining in current action
    this.hitstun    = 0;
    this.blockstun  = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.isBlocking = false;
    this.onGround   = true;
    this.lastHitFrame = -999;

    // Sprite DOM references
    this.wrapEl  = document.getElementById(cfg.side === 'left' ? 'sprite-p1-wrap' : 'sprite-p2-wrap');
    this.imgEl   = document.getElementById(cfg.side === 'left' ? 'sprite-p1'      : 'sprite-p2');
    this.hpEl    = document.getElementById(cfg.side === 'left' ? 'health-p1'      : 'health-p2');
    this.superEl = document.getElementById(cfg.side === 'left' ? 'super-p1'       : 'super-p2');
    this.comboWrapEl = document.getElementById(cfg.side === 'left' ? 'combo-p1'   : 'combo-p2');
    this.comboCountEl = document.getElementById(cfg.side === 'left' ? 'combo-count-p1' : 'combo-count-p2');

    // AI state
    this.aiReactTimer  = 0;
    this.aiDecision    = null; // { action, duration }

    this._loadSprite('idle');
  }

  // ── Sprite helpers ──
  _loadSprite(stateName) {
    const src = getSpriteWithFallback(this.id, stateName);
    if (this.imgEl && this.imgEl.src !== src) this.imgEl.src = src;
  }

  _syncSprite() {
    const map = { idle:'idle', walk:'walk', jump:'jump', punch:'punch',
                  kick:'kick', block:'block', special:'special',
                  hurt:'hurt', ko:'ko' };
    this._loadSprite(map[this.state] || 'idle');
    // Flip sprite based on facing direction
    if (this.wrapEl) {
      const base = this.side === 'right' ? -1 : 1;
      const flip = base * this.facing;
      this.wrapEl.style.transform = flip < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    }
    // Position the element in the stage
    if (this.wrapEl) {
      const pct = ((this.x - 110) / (STAGE_W - 220)) * 100;
      this.wrapEl.parentElement.style.left = `${Math.max(0, Math.min(100, pct))}%`;
    }
  }

  // ── HUD sync ──
  syncHUD() {
    if (this.hpEl) {
      const pct = Math.max(0, (this.hp / HP_MAX) * 100);
      this.hpEl.style.width = pct + '%';
      this.hpEl.classList.toggle('danger', pct <= 25);
    }
    if (this.superEl) {
      this.superEl.style.width = Math.min(100, (this.superMeter / SUPER_MAX) * 100) + '%';
    }
  }

  // ── Combat ──
  get hitboxX() { return this.x - 55; }
  get hitboxW() { return 110; }
  get hitboxY() { return this.y - 220; }
  get hitboxH() { return 220; }

  getAttackBox(moveType) {
    const reach = 80;
    const bx = this.facing > 0 ? this.x + 20 : this.x - 20 - reach;
    const height = moveType === 'kick' ? 100 : 150;
    const yOff   = moveType === 'kick' ? 60 : 20;
    return { x: bx, y: this.y - height - yOff, w: reach, h: height };
  }

  overlaps(box) {
    return !(box.x + box.w < this.hitboxX ||
             box.x > this.hitboxX + this.hitboxW ||
             box.y + box.h < this.hitboxY ||
             box.y > this.hitboxY + this.hitboxH);
  }

  receiveHit(moveData) {
    if (this.state === 'ko') return;
    const dmgRaw = moveData.damage * this.defMult;

    if (this.isBlocking && this.onGround) {
      // Blocked — take chip only
      const chip = dmgRaw * BLOCK_CHIP;
      this.hp = Math.max(0, this.hp - chip);
      this.blockstun = Math.floor(moveData.hitstun * 0.6);
      this.state = 'block';
      this.actionFrame = this.blockstun;
      // small pushback
      this.vx = this.facing * -1.5;
    } else {
      this.hp = Math.max(0, this.hp - dmgRaw);
      this.hitstun = moveData.hitstun;
      this.actionFrame = this.hitstun;
      this.state = 'hurt';
      // Knockback
      this.vx = -this.facing * (moveData.kb * 0.6);
      if (moveData.kb > 10 && this.onGround) this.vy = -5; // launch slightly
    }
    this.superMeter = Math.min(SUPER_MAX, this.superMeter + SUPER_PER_RECV);
    this.syncHUD();
    return dmgRaw;
  }

  // ── Frame update ──
  update(opponent, keys) {
    frameCount++;
    if (this.state === 'ko') {
      this._syncSprite();
      return;
    }

    // ── Timers ──
    if (this.actionFrame > 0) this.actionFrame--;
    if (this.comboTimer > 0) {
      this.comboTimer--;
    } else if (this.comboCount > 0) {
      this.comboCount = 0;
      if (this.comboWrapEl) this.comboWrapEl.classList.remove('active');
    }

    // ── Auto-face opponent ──
    if (this.state === 'idle' || this.state === 'walk') {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    // ── Movement / action input ──
    if (this.isAI) {
      this._doAI(opponent);
    } else {
      this._doInput(keys);
    }

    // ── Physics ──
    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;

    // Ground collision
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        if (this.state === 'jump') {
          this.state = 'idle';
          this.actionFrame = 0;
        }
      }
    } else {
      this.onGround = false;
    }

    // Wall clamp
    if (this.x < WALL_L) { this.x = WALL_L; this.vx = 0; }
    if (this.x > WALL_R) { this.x = WALL_R; this.vx = 0; }

    // Push apart if overlapping
    if (Math.abs(this.x - opponent.x) < 80 && this.onGround) {
      const push = this.x < opponent.x ? -1.5 : 1.5;
      this.x += push;
    }

    // Velocity friction
    this.vx *= 0.82;

    // ── Idle fallback ──
    if (this.actionFrame <= 0 && this.state !== 'idle' &&
        this.state !== 'walk' && this.state !== 'jump' && this.state !== 'ko') {
      this.state = 'idle';
    }

    this._syncSprite();
    this.syncHUD();
  }

  // ── Keyboard input ──
  _doInput(keys) {
    if (this.actionFrame > 0 && (this.state === 'hurt' || this.state === 'block')) return;
    if (this.state === 'punch' || this.state === 'kick' || this.state === 'special') {
      if (this.actionFrame > 0) return; // still in animation
    }

    const cfg = this.side === 'left' ? KEYS_P1 : KEYS_P2;
    this.isBlocking = keys[cfg.block] && this.onGround;

    if (this.isBlocking) {
      this.state = 'block';
      this.actionFrame = 2;
      this.vx *= 0.5;
      return;
    }

    // Attacks
    if (keys[cfg.special] && this.superMeter >= SUPER_MAX) {
      this._doAttack('special');
      this.superMeter = 0;
      return;
    }
    if (keys[cfg.kick])  { this._doAttack('kick');  return; }
    if (keys[cfg.punch]) { this._doAttack('punch'); return; }

    // Jump
    if (keys[cfg.up] && this.onGround) {
      this.vy = JUMP_VY;
      this.onGround = false;
      this.state = 'jump';
      this.actionFrame = 30;
    }

    // Walk
    const moving = keys[cfg.left] || keys[cfg.right];
    if (moving && this.onGround && this.state !== 'jump') {
      this.state = 'walk';
      if (keys[cfg.left])  this.vx = -this.walkSpeed;
      if (keys[cfg.right]) this.vx =  this.walkSpeed;
    } else if (!moving && this.state === 'walk') {
      this.state = 'idle';
    }
  }

  _doAttack(type) {
    const move = this.charData.moves[type];
    this.state = type;
    this.actionFrame = move.startup + move.active + move.recovery;
    // Store when the hitbox becomes active
    this._attackActiveStart = move.startup;
    this._attackActiveEnd   = move.startup + move.active;
    this._attackType        = type;
    this._hitLanded         = false;
  }

  // ── AI Brain ──
  _doAI(opponent) {
    const diff = (window._fightDifficulty) || 'normal';
    const reactFrames = AI_REACT[diff] || 28;
    const aggression  = AI_AGGRESSION[diff] || 0.55;

    this.aiReactTimer++;
    if (this.aiReactTimer < reactFrames) {
      // Execute current decision
      this._executeAIDecision(opponent);
      return;
    }
    this.aiReactTimer = 0;

    const dist = Math.abs(this.x - opponent.x);
    const opHP = opponent.hp / HP_MAX;
    const myHP = this.hp / HP_MAX;

    // Decide
    if (this.actionFrame > 0) return;

    // Low HP — be more defensive if easy, more aggressive if legend
    const defendBias = diff === 'easy' ? 0.5 : diff === 'legend' ? 0.1 : 0.25;
    const shouldDefend = myHP < 0.3 && Math.random() < defendBias;

    if (shouldDefend) {
      this.aiDecision = { action: 'retreat', duration: reactFrames * 2 };
      return;
    }

    // Super move when meter full and opponent close
    if (this.superMeter >= SUPER_MAX && dist < 200 && Math.random() < aggression) {
      this._doAttack('special');
      this.superMeter = 0;
      return;
    }

    if (dist > 250) {
      // Far — approach
      this.aiDecision = { action: 'approach', duration: reactFrames * 3 };
    } else if (dist < 90) {
      // Close — attack or jump back
      const roll = Math.random();
      if (roll < aggression * 0.6) {
        this._doAttack(Math.random() < 0.6 ? 'punch' : 'kick');
      } else if (roll < aggression * 0.8) {
        this.aiDecision = { action: 'jump_back', duration: 1 };
      } else {
        this.isBlocking = true;
        this.state = 'block';
        this.actionFrame = reactFrames;
      }
    } else {
      // Mid range
      const roll = Math.random();
      if (roll < aggression * 0.5) {
        this._doAttack(Math.random() < 0.5 ? 'kick' : 'punch');
      } else if (roll < 0.7) {
        this.aiDecision = { action: 'approach', duration: reactFrames * 2 };
      } else {
        this.aiDecision = { action: 'neutral', duration: reactFrames };
      }
    }
  }

  _executeAIDecision(opponent) {
    if (!this.aiDecision) return;
    if (this.actionFrame > 0) return;

    switch (this.aiDecision.action) {
      case 'approach':
        this.state = 'walk';
        this.vx = (opponent.x > this.x ? 1 : -1) * this.walkSpeed;
        break;
      case 'retreat':
        this.state = 'walk';
        this.vx = (opponent.x > this.x ? -1 : 1) * this.walkSpeed;
        break;
      case 'jump_back':
        if (this.onGround) {
          this.vy = JUMP_VY;
          this.vx = (opponent.x > this.x ? -1 : 1) * this.walkSpeed * 1.5;
          this.state = 'jump';
          this.actionFrame = 30;
        }
        this.aiDecision = null;
        break;
      case 'neutral':
        if (this.state === 'walk') this.state = 'idle';
        break;
    }
  }

  // Hitbox active this frame?
  attackActiveThisFrame() {
    if (!this._attackType) return false;
    const elapsed = (this.charData.moves[this._attackType].startup +
                     this.charData.moves[this._attackType].active +
                     this.charData.moves[this._attackType].recovery) - this.actionFrame;
    return elapsed >= this._attackActiveStart && elapsed < this._attackActiveEnd && !this._hitLanded;
  }
}

// ─── Key Bindings ─────────────────────────────────────────────
const KEYS_P1 = { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown',
                  punch:'z', kick:'x', block:'c', special:'v' };
const KEYS_P2 = { left:'a', right:'d', up:'w', down:'s',
                  punch:'j', kick:'k', block:'l', special:'i' };

const keysDown = {};
document.addEventListener('keydown', e => {
  keysDown[e.key] = true;
  if (e.key === 'Escape') togglePause();
  // Prevent arrow keys scrolling page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keysDown[e.key] = false; });

// ─── Fighters ─────────────────────────────────────────────────
let p1, p2;

// ─── Round tracking ───────────────────────────────────────────
const wins = { p1: 0, p2: 0 };

function initFighters() {
  const cfg = { ...FightConfig.defaults, ...FightConfig.load() };
  window._fightDifficulty = cfg.difficulty;
  totalRounds = cfg.rounds || 3;
  countdown   = cfg.timer  || 60;

  const isVersus = cfg.mode === 'versus';

  p1 = new Fighter({ id: cfg.p1CharId || 'issam', side: 'left',  isAI: false });
  p2 = new Fighter({ id: cfg.p2CharId || 'issam', side: 'right', isAI: !isVersus });

  // Update HUD names
  const p1data = p1.charData;
  const p2data = p2.charData;
  document.querySelectorAll('.hud-side.left  .hud-name')[0].textContent = p1data.name;
  document.querySelectorAll('.hud-side.left  .hud-name-ar')[0].textContent = p1data.nameAr;
  document.querySelectorAll('.hud-side.right .hud-name')[0].textContent = p2data.name;
  document.querySelectorAll('.hud-side.right .hud-name-ar')[0].textContent = p2data.nameAr;

  updateWinDots();
}

// ─── Round start ──────────────────────────────────────────────
function startRound() {
  gameState = 'intro';
  clearTimer();

  // Reset fighter positions & HP
  p1.x = 160; p1.y = GROUND_Y; p1.vx = 0; p1.vy = 0;
  p1.hp = HP_MAX; p1.state = 'idle'; p1.actionFrame = 0;
  p1.hitstun = 0; p1.blockstun = 0; p1.comboCount = 0;

  p2.x = STAGE_W - 260; p2.y = GROUND_Y; p2.vx = 0; p2.vy = 0;
  p2.hp = HP_MAX; p2.state = 'idle'; p2.actionFrame = 0;
  p2.hitstun = 0; p2.blockstun = 0; p2.comboCount = 0;

  p1.syncHUD(); p2.syncHUD();

  // Round indicator
  const roundEl = document.getElementById('round-indicator');
  const roundNames = ['الجولة الأولى','الجولة الثانية','الجولة الثالثة','الجولة الرابعة','الجولة الخامسة'];
  if (roundEl) {
    roundEl.innerHTML = `<div>ROUND ${currentRound}</div><div class="round-ar">${roundNames[currentRound-1] || ''}</div>`;
    roundEl.style.opacity = '1';
  }

  showMessage('FIGHT!', 'fight-message', ROUND_START_DELAY);

  setTimeout(() => {
    gameState = 'fighting';
    startTimer();
  }, ROUND_START_DELAY);
}

// ─── Timer ────────────────────────────────────────────────────
function startTimer() {
  const cfg = { ...FightConfig.defaults, ...FightConfig.load() };
  countdown = cfg.timer || 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (gameState !== 'fighting') return;
    countdown--;
    updateTimerDisplay();
    if (countdown <= 0) timeOut();
  }, 1000);
}

function clearTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (el) {
    el.textContent = countdown;
    el.style.color = countdown <= 10 ? '#FF4444' : '';
  }
}

function timeOut() {
  clearTimer();
  if (p1.hp > p2.hp) endRound('p1');
  else if (p2.hp > p1.hp) endRound('p2');
  else endRound('draw');
}

// ─── Hit detection ────────────────────────────────────────────
function checkHits() {
  if (gameState !== 'fighting') return;

  [{ attacker: p1, defender: p2 }, { attacker: p2, defender: p1 }].forEach(({ attacker, defender }) => {
    if (!attacker.attackActiveThisFrame()) return;
    const box = attacker.getAttackBox(attacker._attackType);
    if (defender.overlaps(box)) {
      attacker._hitLanded = true;
      const dmg = defender.receiveHit(attacker.charData.moves[attacker._attackType]);

      // Combo counter
      attacker.comboCount++;
      attacker.comboTimer = 60;
      const comboWrap = attacker.comboWrapEl;
      const comboCount = attacker.comboCountEl;
      if (comboWrap && comboCount) {
        comboCount.textContent = attacker.comboCount;
        comboWrap.classList.add('active');
      }

      // Super meter for attacker
      attacker.superMeter = Math.min(SUPER_MAX, attacker.superMeter + SUPER_PER_HIT);
      attacker.syncHUD();

      // Screen shake
      screenShake(attacker._attackType === 'special' ? 10 : 4);

      // Check KO
      if (defender.hp <= 0) {
        defender.hp = 0;
        defender.syncHUD();
        defender.state = 'ko';
        const winner = attacker === p1 ? 'p1' : 'p2';
        const perfect = defender.hp === HP_MAX; // never hit
        setTimeout(() => endRound(winner, perfect), 400);
      }
    }
  });
}

// ─── Round end ────────────────────────────────────────────────
function endRound(winner, perfect = false) {
  if (gameState === 'round_end' || gameState === 'game_end') return;
  gameState = 'round_end';
  clearTimer();

  if (winner === 'draw') {
    showMessage('DRAW', 'ko-message', KO_DISPLAY_TIME);
  } else {
    if (perfect) showMessage('PERFECT!', 'perfect-message', KO_DISPLAY_TIME);
    showMessage('K.O.', 'ko-message', KO_DISPLAY_TIME);
    wins[winner]++;
    updateWinDots();
  }

  setTimeout(() => {
    const needed = Math.ceil(totalRounds / 2);
    if (wins.p1 >= needed || wins.p2 >= needed) {
      endGame(wins.p1 >= needed ? 'p1' : 'p2');
    } else {
      currentRound++;
      startRound();
    }
  }, BETWEEN_ROUND);
}

function updateWinDots() {
  ['p1','p2'].forEach(pid => {
    const el = document.getElementById(`wins-${pid}`);
    if (!el) return;
    const dots = el.querySelectorAll('.win-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i < wins[pid]));
  });
}

// ─── Game end ─────────────────────────────────────────────────
function endGame(winner) {
  gameState = 'game_end';
  clearTimer();

  const char = winner === 'p1' ? p1.charData : p2.charData;
  const msg  = winner === 'p1' ? `${char.name} WINS!` : `${char.name} WINS!`;

  showMessage(msg, 'ko-message', 99999);

  // Show return overlay after a beat
  setTimeout(() => {
    const layer = document.getElementById('message-layer');
    if (!layer) return;
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;bottom:30px;left:50%;transform:translateX(-50%);
      font-size:8px;color:var(--gold-d);letter-spacing:2px;text-align:center;`;
    div.innerHTML = `<div style="margin-bottom:8px">${char.nameAr}</div>
      <a href="index.html" style="color:var(--gold-l);text-decoration:none">PRESS Z — MAIN MENU</a>`;
    layer.appendChild(div);
  }, 2000);
}

// ─── Screen shake ─────────────────────────────────────────────
let shakeFrames = 0, shakeMag = 0;
function screenShake(mag) { shakeFrames = 8; shakeMag = mag; }
function applyShake(el) {
  if (shakeFrames > 0) {
    shakeFrames--;
    const ox = (Math.random() - 0.5) * shakeMag;
    const oy = (Math.random() - 0.5) * shakeMag;
    el.style.transform = `translate(${ox}px,${oy}px)`;
  } else {
    el.style.transform = '';
  }
}

// ─── Message overlay ──────────────────────────────────────────
function showMessage(text, cssClass, duration) {
  const layer = document.getElementById('message-layer');
  if (!layer) return;
  // Remove existing same-class messages
  layer.querySelectorAll('.' + cssClass).forEach(e => e.remove());

  const el = document.createElement('div');
  el.className = cssClass;
  el.textContent = text;
  layer.appendChild(el);

  if (duration < 99999) {
    setTimeout(() => {
      el.classList.add('fade');
      setTimeout(() => el.remove(), 600);
    }, duration);
  }
}

// ─── Pause ────────────────────────────────────────────────────
let prevState = 'fighting';
function togglePause() {
  const overlay = document.getElementById('pause-menu');
  if (!overlay) return;
  if (gameState === 'paused') {
    gameState = prevState;
    overlay.classList.remove('active');
  } else if (gameState === 'fighting') {
    prevState = gameState;
    gameState = 'paused';
    overlay.classList.add('active');
  }
}

document.getElementById('resume-btn')?.addEventListener('click', togglePause);
document.getElementById('restart-btn')?.addEventListener('click', () => {
  const overlay = document.getElementById('pause-menu');
  overlay?.classList.remove('active');
  wins.p1 = 0; wins.p2 = 0;
  currentRound = 1;
  initFighters();
  startRound();
});

// ─── Main Loop ────────────────────────────────────────────────
const stageEl = document.querySelector('.stage-area');

function gameLoop() {
  animFrameId = requestAnimationFrame(gameLoop);

  if (gameState === 'paused' || gameState === 'intro' ||
      gameState === 'round_end' || gameState === 'game_end') {
    // Still render fighters but don't update combat
    if (p1) p1._syncSprite();
    if (p2) p2._syncSprite();
    if (stageEl) applyShake(stageEl);
    return;
  }

  if (gameState !== 'fighting') return;

  p1.update(p2, keysDown);
  p2.update(p1, keysDown);
  checkHits();

  if (stageEl) applyShake(stageEl);
}

// ─── Boot ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Load stage background from config
  const cfg = { ...FightConfig.defaults, ...FightConfig.load() };
  const stageBg = document.getElementById('stage-bg-img');
  if (stageBg) stageBg.src = `assets/stages/${cfg.stage || 'djemaa'}.png`;

  const STAGE_NAMES = {
    djemaa:      ['DJEMAA EL-FNA',   'ساحة جامع الفنا'],
    fes:         ['MEDINA OF FES',   'مدينة فاس'],
    tangier:     ['KASBAH TANGIER',  'طنجة'],
    agadir:      ['AGADIR BEACH',    'أكادير'],
    chefchaouen: ['CHEFCHAOUEN',     'شفشاون'],
    atlas:       ['ATLAS MOUNTAINS', 'جبال الأطلس'],
  };
  const [stageName, stageAr] = STAGE_NAMES[cfg.stage] || STAGE_NAMES.djemaa;
  const snEl = document.getElementById('stage-name-fight');
  const saEl = document.getElementById('stage-ar-fight');
  if (snEl) snEl.textContent = stageName;
  if (saEl) saEl.textContent = stageAr;

  initFighters();
  startRound();
  gameLoop();
});