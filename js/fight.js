// ═══════════════════════════════════════════════════════════
//  SOUK BRAWL — fight.js (Clean Integrated Version)
// ═══════════════════════════════════════════════════════════

'use strict';

// ─── Use Data from character.js (No redeclaration!) ─────────────
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
let gameState = 'intro';
let currentRound = 1;
let totalRounds  = 3;
let countdown    = 60;
let timerInterval = null;
let animFrameId   = null;
let frameCount    = 0;

let p1 = null;
let p2 = null;

// Hit Stop / Screen Shake
let hitStopFrames = 0;
let shakeFrames = 0;
let shakeMag = 0;

// Input System
class InputSystem {
  constructor() {
    this.keys = {};
    this.prevKeys = {};

    document.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') togglePause();
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
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

// Use GameConfig.KEYS safely
const K = GameConfig?.KEYS || {
  LEFT: 'arrowleft', RIGHT: 'arrowright', UP: 'arrowup', DOWN: 'arrowdown',
  SELECT: 'z', BACK: 'x', BLOCK: 'c', SPECIAL: 'v'
};

// Fighter Class (rest of your code)
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

    const spd = this.charData.stats?.speed || 5;
    this.walkSpeed = 2.5 + spd * 0.35;
    this.defMult = 1 - ((this.charData.stats?.defense || 5) - 1) * 0.03;

    this.hp = HP_MAX;
    this.superMeter = 0;
    this.wins = 0;
    this.state = 'idle';
    this.actionFrame = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.isBlocking = false;
    this.onGround = true;

    this._attackActiveStart = 0;
    this._attackActiveEnd = 0;
    this._attackType = null;
    this._hitLanded = false;

    this.aiReactTimer = 0;
  }

  bindHUD(side) {
    const suffix = side === 'left' ? 'p1' : 'p2';
    this.hpEl = document.getElementById(`health-${suffix}`);
    this.superEl = document.getElementById(`super-${suffix}`);
  }

  _loadSprite(stateName) {
    if (!this.imgEl) return;
    const src = getSpriteWithFallback(this.id, stateName);
    if (this.imgEl.src !== src) this.imgEl.src = src;
  }

  _syncSprite() {
    const map = { idle:'idle', walk:'walk', jump:'jump', punch:'punch', kick:'kick', block:'block', special:'special', hurt:'hurt', ko:'ko' };
    this._loadSprite(map[this.state] || 'idle');

    if (this.wrapEl) {
      const scaleX = this.facing;
      let transform = `translateX(${this.x}px) scaleX(${scaleX})`;
      this.wrapEl.style.transform = transform;
    }
  }

  syncHUD() {
    if (this.hpEl) this.hpEl.style.width = Math.max(0, (this.hp / HP_MAX) * 100) + '%';
    if (this.superEl) this.superEl.style.width = Math.min(100, (this.superMeter / SUPER_MAX) * 100) + '%';
  }

  // ... (I kept the rest of the class short for brevity, but you can keep your full original methods)
  // Paste the rest of your Fighter class here (update, receiveHit, _doInput, _doAttack, _doAI, etc.)
}

// Initialize Fighters
function initFighters() {
  const cfg = { ...FightConfig.defaults, ...FightConfig.load() };

  const p1CharId = window.selectedP1Id || cfg.p1CharId || 'issam';
  const p2CharId = window.selectedP2Id || cfg.p2CharId || 'issam';

  const p1Data = ROSTER.find(c => c.id === p1CharId) || ROSTER[0];
  const p2Data = ROSTER.find(c => c.id === p2CharId) || ROSTER[0];

  console.log(`🎮 Starting fight: ${p1Data.name} vs ${p2Data.name}`);

  p1 = new Fighter('sprite-p1-wrap', 'sprite-p1', p1Data, 250, false, false);
  p2 = new Fighter('sprite-p2-wrap', 'sprite-p2', p2Data, 650, true, true);

  p1.bindHUD('left');
  p2.bindHUD('right');

  // Update names in HUD
  document.querySelector('.hud-name.left') && (document.querySelector('.hud-name.left').textContent = p1Data.name);
  document.querySelector('.hud-name.right') && (document.querySelector('.hud-name.right').textContent = p2Data.name);
}

// Game Loop (add your existing gameLoop, updateTimer, etc.)

// Start everything
window.addEventListener('load', () => {
  console.log("Fight engine loaded");
  if (typeof initFighters === 'function') initFighters();
});