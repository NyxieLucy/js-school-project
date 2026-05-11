// ═══════════════════════════════════════════════════════════
//  SOUK BRAWL — fight.js (Complete Working Version)
// ═══════════════════════════════════════════════════════════

'use strict';

// ─── Dependencies ─────────────────────────────────────────────
const ROSTER = window.ROSTER || [];

const FightConfig = window.FightConfig || {
  defaults: {
    mode: 'arcade',
    difficulty: 'normal',
    rounds: 3,
    timer: 60,
    p1CharId: 'issam',
    p2CharId: 'issam'
  },
  load() {
    try {
      return JSON.parse(sessionStorage.getItem('soukbrawl_fight')) || {};
    } catch(e) { return {}; }
  }
};

const getSpriteWithFallback = window.getSpriteWithFallback || function(charId, stateName) {
  return `assets/characters/${charId}/${stateName}.png`;
};

const GameConfig = window.GameConfig || {
  KEYS: {
    LEFT: 'arrowleft', RIGHT: 'arrowright', UP: 'arrowup', DOWN: 'arrowdown',
    SELECT: 'z', BACK: 'x', BLOCK: 'c', SPECIAL: 'v'
  }
};

// ─── Constants ───────────────────────────────────────────────
const STAGE_W   = 900;
const STAGE_H   = 420;
const GROUND_Y  = 340;
const GRAVITY   = 0.65;
const JUMP_VY   = -14;
const WALL_L    = 40;
const WALL_R    = STAGE_W - 40;

const HP_MAX    = 100;
const SUPER_MAX = 100;
const SUPER_PER_HIT = 8;
const SUPER_PER_RECV = 4;
const BLOCK_CHIP = 0.15;

const ROUND_START_DELAY = 2000;
const KO_DISPLAY_TIME   = 2500;
const BETWEEN_ROUND     = 3000;

const AI_REACT = { easy: 45, normal: 28, hard: 14, legend: 6 };
const AI_AGGRESSION = { easy: 0.3, normal: 0.55, hard: 0.75, legend: 0.92 };

// ─── Game State ──────────────────────────────────────────────
let gameState = 'intro'; // intro, fight, ko, between, over, paused
let currentRound = 1;
let totalRounds  = 3;
let countdown    = 60;
let timerInterval = null;
let animFrameId   = null;
let frameCount    = 0;
let isPaused      = false;

let p1 = null;
let p2 = null;

// Hit Stop / Screen Shake
let hitStopFrames = 0;
let shakeFrames = 0;
let shakeMag = 0;

// ─── Input System ────────────────────────────────────────────
class InputSystem {
  constructor() {
    this.keys = {};
    this.prevKeys = {};

    document.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (e.key === 'Escape') togglePause();
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    });

    document.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  isKeyPressed(key) { return !!this.keys[key?.toLowerCase()]; }
  isKeyJustPressed(key) {
    const k = key?.toLowerCase();
    return !!this.keys[k] && !this.prevKeys[k];
  }
  update() { this.prevKeys = { ...this.keys }; }
}

const input = new InputSystem();
const K = GameConfig.KEYS;

// ─── Fighter Class ───────────────────────────────────────────
class Fighter {
  constructor(wrapId, imgId, charData, startX, isFacingLeft, isAI = false) {
    this.wrapEl  = document.getElementById(wrapId);
    this.imgEl   = document.getElementById(imgId);
    this.charData = charData;
    this.id = charData.id;
    this.isAI = isAI;
    this.side = isFacingLeft ? 'right' : 'left';

    this.x = startX;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = isFacingLeft ? -1 : 1;
    this.facingLeft = isFacingLeft;

    const stats = this.charData.stats || { speed: 5, power: 5, defense: 5 };
    this.walkSpeed = 2.5 + (stats.speed || 5) * 0.35;
    this.defMult = 1 - ((stats.defense || 5) - 1) * 0.03;
    this.powerMult = 1 + ((stats.power || 5) - 1) * 0.05;

    this.hp = HP_MAX;
    this.superMeter = 0;
    this.wins = 0;
    this.state = 'idle';
    this.prevState = 'idle';
    this.actionFrame = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.isBlocking = false;
    this.onGround = true;

    // Attack data
    this._attackActive = false;
    this._attackType = null;
    this._hitLanded = false;
    this._attackDuration = 0;
    this._attackFrame = 0;

    // AI
    this.aiReactTimer = 0;
    this.aiTargetX = startX;
    this.aiState = 'neutral';

    // Hitbox (relative to center)
    this.width = 60;
    this.height = 140;
    this.hitboxW = 50;
    this.hitboxH = 130;
  }

  bindHUD(side) {
    const suffix = side === 'left' ? 'p1' : 'p2';
    this.hpEl = document.getElementById(`health-${suffix}`);
    this.superEl = document.getElementById(`super-${suffix}`);
    this.comboEl = document.getElementById(`combo-count-${suffix}`);
    this.comboDisplay = document.getElementById(`combo-${suffix}`);
    this.winsEl = document.getElementById(`wins-${suffix}`);
  }

  getHitbox() {
    return {
      x: this.x - this.hitboxW / 2,
      y: this.y - this.hitboxH,
      w: this.hitboxW,
      h: this.hitboxH
    };
  }

  getAttackHitbox() {
    if (!this._attackActive) return null;
    const reach = this._attackType === 'kick' ? 90 : (this._attackType === 'special' ? 110 : 70);
    return {
      x: this.facing > 0 ? this.x + this.hitboxW / 2 : this.x - this.hitboxW / 2 - reach,
      y: this.y - this.hitboxH * 0.6,
      w: reach,
      h: this.hitboxH * 0.5
    };
  }

  _loadSprite(stateName) {
    if (!this.imgEl) return;
    const src = getSpriteWithFallback(this.id, stateName);
    if (this.imgEl.getAttribute('src') !== src) this.imgEl.src = src;
  }

  _syncSprite() {
    const map = {
      idle: 'idle', walk: 'walk', jump: 'jump', punch: 'punch',
      kick: 'kick', block: 'block', special: 'special', hurt: 'hurt', ko: 'ko'
    };
    this._loadSprite(map[this.state] || 'idle');

    if (this.wrapEl) {
      const scaleX = this.facing;
      this.wrapEl.style.transform = `translateX(${this.x}px) scaleX(${scaleX})`;
    }
  }

  syncHUD() {
    if (this.hpEl) {
      const pct = Math.max(0, (this.hp / HP_MAX) * 100);
      this.hpEl.style.width = pct + '%';
      this.hpEl.classList.toggle('danger', pct < 25);
    }
    if (this.superEl) {
      this.superEl.style.width = Math.min(100, (this.superMeter / SUPER_MAX) * 100) + '%';
    }
    if (this.comboEl && this.comboDisplay) {
      this.comboEl.textContent = this.comboCount;
      this.comboDisplay.classList.toggle('active', this.comboCount > 1);
    }
    if (this.winsEl) {
      const dots = this.winsEl.querySelectorAll('.win-dot');
      dots.forEach((dot, i) => dot.classList.toggle('active', i < this.wins));
    }
  }

  // ─── Physics & Movement ────────────────────────────────────
  updatePhysics() {
    if (this.state === 'ko') return;

    // Gravity
    if (!this.onGround) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
        if (this.state === 'jump') this.state = 'idle';
      }
    }

    // Horizontal movement
    this.x += this.vx;
    this.vx *= 0.85; // friction

    // Wall clamp
    this.x = Math.max(WALL_L, Math.min(WALL_R, this.x));

    // Update onGround for state checks
    this.onGround = this.y >= GROUND_Y - 1;
  }

  // ─── Input Handling ────────────────────────────────────────
  _doInput() {
    if (this.isAI || this.hitstun > 0 || this.blockstun > 0 || this.state === 'ko') return;
    if (!this.onGround && this.state !== 'jump') return;

    const left  = input.isKeyPressed(K.LEFT);
    const right = input.isKeyPressed(K.RIGHT);
    const up    = input.isKeyPressed(K.UP);
    const down  = input.isKeyPressed(K.DOWN);
    const punch = input.isKeyJustPressed(K.SELECT);
    const kick  = input.isKeyJustPressed(K.BACK);
    const block = input.isKeyPressed(K.BLOCK);
    const special = input.isKeyJustPressed(K.SPECIAL);

    // Block
    if (block && this.onGround && this.state !== 'special') {
      this.isBlocking = true;
      this.state = 'block';
      this.vx = 0;
      return;
    } else {
      this.isBlocking = false;
    }

    // Special (requires full super meter)
    if (special && this.superMeter >= SUPER_MAX && this.onGround) {
      this._startAttack('special', 45);
      this.superMeter = 0;
      return;
    }

    // Jump
    if (up && this.onGround) {
      this.vy = JUMP_VY;
      this.onGround = false;
      this.state = 'jump';
      return;
    }

    // Attacks
    if (punch && this.onGround) {
      this._startAttack('punch', 20);
      return;
    }
    if (kick && this.onGround) {
      this._startAttack('kick', 28);
      return;
    }

    // Movement
    if (left) {
      this.vx = -this.walkSpeed;
      this.facing = -1;
      if (this.onGround) this.state = 'walk';
    } else if (right) {
      this.vx = this.walkSpeed;
      this.facing = 1;
      if (this.onGround) this.state = 'walk';
    } else if (this.onGround) {
      this.state = 'idle';
    }
  }

  // ─── AI Logic ──────────────────────────────────────────────
  _doAI(opponent) {
    if (!this.isAI || this.hitstun > 0 || this.blockstun > 0 || this.state === 'ko') return;
    if (!this.onGround && this.state !== 'jump') return;

    const diff = FightConfig.load().difficulty || 'normal';
    const react = AI_REACT[diff] || 28;
    const aggression = AI_AGGRESSION[diff] || 0.55;

    this.aiReactTimer++;
    if (this.aiReactTimer < react) return;
    this.aiReactTimer = 0;

    const dist = opponent.x - this.x;
    const absDist = Math.abs(dist);
    const facingOpponent = (dist > 0 && this.facing > 0) || (dist < 0 && this.facing < 0);

    // Face opponent
    if (!facingOpponent) this.facing = dist > 0 ? 1 : -1;

    // React to opponent attack
    if (opponent._attackActive && absDist < 120) {
      if (Math.random() < 0.4) {
        this.isBlocking = true;
        this.state = 'block';
        this.vx = 0;
        return;
      } else if (Math.random() < 0.3 && this.onGround) {
        this.vy = JUMP_VY;
        this.onGround = false;
        this.state = 'jump';
        return;
      }
    }

    this.isBlocking = false;

    // Attack if close
    if (absDist < 80 && Math.random() < aggression) {
      if (this.superMeter >= SUPER_MAX && Math.random() < 0.3) {
        this._startAttack('special', 45);
        this.superMeter = 0;
        return;
      }
      const atk = Math.random() < 0.6 ? 'punch' : 'kick';
      this._startAttack(atk, atk === 'punch' ? 20 : 28);
      return;
    }

    // Move toward opponent
    if (absDist > 70) {
      this.vx = dist > 0 ? this.walkSpeed * 0.9 : -this.walkSpeed * 0.9;
      this.facing = dist > 0 ? 1 : -1;
      if (this.onGround) this.state = 'walk';
    } else {
      this.vx = 0;
      if (this.onGround) this.state = 'idle';
    }
  }

  // ─── Attack System ─────────────────────────────────────────
  _startAttack(type, duration) {
    this.state = type;
    this._attackType = type;
    this._attackDuration = duration;
    this._attackFrame = 0;
    this._attackActive = false;
    this._hitLanded = false;
    this.vx = 0;
  }

  _updateAttack() {
    if (this.state !== 'punch' && this.state !== 'kick' && this.state !== 'special') {
      this._attackActive = false;
      return;
    }

    this._attackFrame++;

    // Active frames window
    const activeStart = this._attackType === 'special' ? 12 : (this._attackType === 'kick' ? 8 : 4);
    const activeEnd = this._attackType === 'special' ? 35 : (this._attackType === 'kick' ? 22 : 14);

    this._attackActive = this._attackFrame >= activeStart && this._attackFrame <= activeEnd;

    if (this._attackFrame >= this._attackDuration) {
      this.state = this.onGround ? 'idle' : 'jump';
      this._attackActive = false;
    }
  }

  // ─── Hit Reception ─────────────────────────────────────────
  receiveHit(attacker, type) {
    if (this.state === 'ko') return false;

    const atkBox = attacker.getAttackHitbox();
    const myBox = this.getHitbox();

    if (!atkBox || !rectsOverlap(atkBox, myBox)) return false;
    if (this._hitLanded) return false; // already hit this attack

    let damage = 0;
    let stun = 0;
    let pushX = 0;
    let pushY = 0;

    switch (type) {
      case 'punch': damage = 8; stun = 12; pushX = 4; break;
      case 'kick':  damage = 12; stun = 18; pushX = 6; pushY = -3; break;
      case 'special': damage = 25; stun = 40; pushX = 10; pushY = -6; break;
    }

    damage *= attacker.powerMult;

    if (this.isBlocking) {
      // Chip damage + reduced pushback
      damage *= BLOCK_CHIP;
      pushX *= 0.3;
      this.blockstun = Math.floor(stun * 0.5);
      this.state = 'block';
      triggerHitStop(3);
      triggerShake(2, 2);
    } else {
      this.hp -= damage;
      this.hitstun = stun;
      this.state = 'hurt';
      this.vx = attacker.facing * pushX;
      this.vy = pushY;
      this.onGround = false;
      this.comboCount = 0; // reset own combo
      this.comboTimer = 0;

      // Attacker combo + super
      attacker.comboCount++;
      attacker.comboTimer = 60;
      attacker.superMeter = Math.min(SUPER_MAX, attacker.superMeter + SUPER_PER_HIT);
      this.superMeter = Math.min(SUPER_MAX, this.superMeter + SUPER_PER_RECV);

      triggerHitStop(type === 'special' ? 12 : 6);
      triggerShake(type === 'special' ? 8 : 4, type === 'special' ? 6 : 3);
    }

    this.hp = Math.max(0, this.hp);
    attacker._hitLanded = true;

    // Check KO
    if (this.hp <= 0) {
      this.state = 'ko';
      this.hp = 0;
      handleKO(attacker);
    }

    return true;
  }

  // ─── Main Update ────────────────────────────────────────────
  update(opponent) {
    if (gameState === 'paused') return;

    this.actionFrame++;

    // Decrement stuns
    if (this.hitstun > 0) {
      this.hitstun--;
      if (this.hitstun <= 0 && this.state === 'hurt') {
        this.state = this.onGround ? 'idle' : 'jump';
      }
    }
    if (this.blockstun > 0) {
      this.blockstun--;
      if (this.blockstun <= 0) {
        this.isBlocking = false;
        this.state = this.onGround ? 'idle' : 'jump';
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    // Input / AI
    if (this.hitstun <= 0 && this.blockstun <= 0 && this.state !== 'ko') {
      if (this.isAI) {
        this._doAI(opponent);
      } else {
        this._doInput();
      }
    }

    // Update attack state
    this._updateAttack();

    // Physics
    this.updatePhysics();

    // Sync visuals
    this._syncSprite();
    this.syncHUD();
  }
}

// ─── Collision Helper ──────────────────────────────────────────
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ─── Visual Effects ──────────────────────────────────────────
function triggerHitStop(frames) {
  hitStopFrames = Math.max(hitStopFrames, frames);
}

function triggerShake(frames, magnitude) {
  shakeFrames = Math.max(shakeFrames, frames);
  shakeMag = Math.max(shakeMag, magnitude);
}

function applyScreenShake() {
  const stage = document.getElementById('stage-area');
  if (!stage) return;
  if (shakeFrames > 0) {
    const dx = (Math.random() - 0.5) * shakeMag * 2;
    const dy = (Math.random() - 0.5) * shakeMag * 2;
    stage.style.transform = `translate(${dx}px, ${dy}px)`;
    shakeFrames--;
  } else {
    stage.style.transform = 'translate(0,0)';
  }
}

// ─── Pause System ────────────────────────────────────────────
function togglePause() {
  if (gameState === 'over' || gameState === 'intro') return;
  isPaused = !isPaused;
  gameState = isPaused ? 'paused' : 'fight';

  const menu = document.getElementById('pause-menu');
  if (menu) menu.classList.toggle('active', isPaused);
}

// ─── Message Display ─────────────────────────────────────────
function showMessage(html, duration = 2000) {
  const layer = document.getElementById('message-layer');
  if (!layer) return;
  layer.innerHTML = html;
  if (duration > 0) {
    setTimeout(() => { layer.innerHTML = ''; }, duration);
  }
}

function clearMessage() {
  const layer = document.getElementById('message-layer');
  if (layer) layer.innerHTML = '';
}

// ─── Round / Win System ──────────────────────────────────────
function updateRoundIndicator() {
  const el = document.getElementById('round-indicator');
  if (el) {
    const ar = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];
    el.innerHTML = `<div>ROUND ${currentRound}</div><div class="round-ar">الجولة ${ar[currentRound - 1] || ar[0]}</div>`;
  }
}

function startRound() {
  gameState = 'intro';
  updateRoundIndicator();
  countdown = FightConfig.defaults.timer;
  updateTimerDisplay();

  // Reset fighters
  p1.hp = HP_MAX;
  p1.superMeter = 0;
  p1.state = 'idle';
  p1.hitstun = 0;
  p1.blockstun = 0;
  p1.comboCount = 0;
  p1.x = 250;
  p1.y = GROUND_Y;
  p1.vx = 0;
  p1.vy = 0;
  p1.onGround = true;
  p1.facing = 1;

  p2.hp = HP_MAX;
  p2.superMeter = 0;
  p2.state = 'idle';
  p2.hitstun = 0;
  p2.blockstun = 0;
  p2.comboCount = 0;
  p2.x = 650;
  p2.y = GROUND_Y;
  p2.vx = 0;
  p2.vy = 0;
  p2.onGround = true;
  p2.facing = -1;

  p1.syncHUD();
  p2.syncHUD();

  // Show FIGHT message
  showMessage(`<div class="fight-message">FIGHT!</div>`, 1500);

  setTimeout(() => {
    gameState = 'fight';
    startTimer();
  }, ROUND_START_DELAY);
}

function handleKO(winner) {
  gameState = 'ko';
  stopTimer();
  winner.wins++;

  const isPerfect = winner.hp >= HP_MAX;
  let msg = '<div class="ko-message">K.O.</div>';
  if (isPerfect) msg += '<div class="perfect-message">PERFECT!</div>';
  showMessage(msg, KO_DISPLAY_TIME);

  setTimeout(() => {
    if (winner.wins >= Math.ceil(totalRounds / 2)) {
      endMatch(winner);
    } else {
      currentRound++;
      startRound();
    }
  }, BETWEEN_ROUND);
}

function endMatch(winner) {
  gameState = 'over';
  const winnerName = winner.charData.name || winner.id.toUpperCase();
  showMessage(`
    <div class="ko-message">${winnerName} WINS!</div>
    <div style="margin-top:20px; font-size:14px; color:var(--gold-l);">
      <a href="index.html" style="color:var(--gold-l); text-decoration:none; border:2px solid var(--gold-dim); padding:8px 20px;">MAIN MENU</a>
    </div>
  `, 0);
}

// ─── Timer ───────────────────────────────────────────────────
function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (el) el.textContent = countdown;
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState !== 'fight' || isPaused) return;
    countdown--;
    updateTimerDisplay();
    if (countdown <= 0) {
      stopTimer();
      handleTimeout();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimeout() {
  gameState = 'ko';
  if (p1.hp > p2.hp) {
    handleKO(p1);
  } else if (p2.hp > p1.hp) {
    handleKO(p2);
  } else {
    // Draw - both get a win (or replay)
    showMessage('<div class="ko-message">DRAW!</div>', KO_DISPLAY_TIME);
    setTimeout(() => startRound(), BETWEEN_ROUND);
  }
}

// ─── Game Loop ───────────────────────────────────────────────
function gameLoop() {
  animFrameId = requestAnimationFrame(gameLoop);
  frameCount++;

  // Hit stop
  if (hitStopFrames > 0) {
    hitStopFrames--;
    return;
  }

  // Update input prev state
  input.update();

  // Update fighters
  if (p1 && p2 && gameState === 'fight') {
    p1.update(p2);
    p2.update(p1);

    // Check hits
    if (p1._attackActive && !p1._hitLanded) {
      p2.receiveHit(p1, p1._attackType);
    }
    if (p2._attackActive && !p2._hitLanded) {
      p1.receiveHit(p2, p2._attackType);
    }
  }

  // Screen effects
  applyScreenShake();
}

// ─── Initialization ──────────────────────────────────────────
function initFighters() {
  const cfg = { ...FightConfig.defaults, ...FightConfig.load() };

  const p1CharId = window.selectedP1Id || cfg.p1CharId || 'issam';
  const p2CharId = window.selectedP2Id || cfg.p2CharId || 'issam';

  const p1Data = ROSTER.find(c => c.id === p1CharId) || ROSTER[0] || {
    id: p1CharId, name: p1CharId.toUpperCase(), stats: { speed: 5, power: 5, defense: 5 }
  };
  const p2Data = ROSTER.find(c => c.id === p2CharId) || ROSTER[0] || {
    id: p2CharId, name: p2CharId.toUpperCase(), stats: { speed: 5, power: 5, defense: 5 }
  };

  console.log(`🎮 Starting fight: ${p1Data.name} vs ${p2Data.name}`);

  p1 = new Fighter('sprite-p1-wrap', 'sprite-p1', p1Data, 250, false, false);
  p2 = new Fighter('sprite-p2-wrap', 'sprite-p2', p2Data, 650, true, true);

  p1.bindHUD('left');
  p2.bindHUD('right');

  // Update names in HUD
  const nameLeft = document.querySelector('.hud-name.left');
  const nameRight = document.querySelector('.hud-name.right');
  const nameArLeft = document.querySelector('.hud-name-ar');
  const nameArRight = document.querySelectorAll('.hud-name-ar')[1];

  if (nameLeft) nameLeft.textContent = p1Data.name || p1Data.id.toUpperCase();
  if (nameRight) nameRight.textContent = p2Data.name || p2Data.id.toUpperCase();
  if (nameArLeft) nameArLeft.textContent = p1Data.nameAr || '';
  if (nameArRight) nameArRight.textContent = p2Data.nameAr || '';

  // Expose globally for debugging
  window.p1 = p1;
  window.p2 = p2;

  // Start first round
  startRound();

  // Start loop if not already running
  if (!animFrameId) gameLoop();
}

// ─── Pause Menu Buttons ──────────────────────────────────────
function setupPauseMenu() {
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      if (isPaused) togglePause();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      isPaused = false;
      const menu = document.getElementById('pause-menu');
      if (menu) menu.classList.remove('active');
      currentRound = 1;
      p1.wins = 0;
      p2.wins = 0;
      clearMessage();
      startRound();
    });
  }
}

// ─── Boot ────────────────────────────────────────────────────
window.addEventListener('load', () => {
  console.log("Fight engine loaded");
  setupPauseMenu();
  // initFighters() is called from fight.html after character selection
});
