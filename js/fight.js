// ═══════════════════════════════════════════════════════════
//  SOUK BRAWL — fight.js
//  Full fight engine: input, physics, hitboxes, AI, rounds
//  Aligned with: character.js (ROSTER, FightConfig, getSpriteWithFallback)
// ═══════════════════════════════════════════════════════════

'use strict';

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

// ─── Hit Stop / Screen Shake ────────────────────────────────
let hitStopFrames = 0;
let shakeFrames = 0;
let shakeMag = 0;

// ─── Input System (self-contained, matches input.js API) ─────
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

  isKeyPressed(key) {
    return !!this.keys[key.toLowerCase()];
  }

  isKeyJustPressed(key) {
    const k = key.toLowerCase();
    return !!this.keys[k] && !this.prevKeys[k];
  }

  update() {
    this.prevKeys = { ...this.keys };
  }
}

// ─── Key Bindings (lowercase to match input.js convention) ────
const GameConfig = {
  KEYS: {
    LEFT:    'arrowleft',
    RIGHT:   'arrowright',
    UP:      'arrowup',
    DOWN:    'arrowdown',
    SELECT:  'z',
    BACK:    'x',
    BLOCK:   'c',
    SPECIAL: 'v'
  }
};

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

    const spd = this.charData.stats?.speed || 5;
    const def = this.charData.stats?.defense || 5;
    this.walkSpeed = 2.5 + spd * 0.35;
    this.defMult = 1 - (def - 1) * 0.03;

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
    this.lastHitFrame = -999;

    this._attackActiveStart = 0;
    this._attackActiveEnd = 0;
    this._attackType = null;
    this._hitLanded = false;

    this.aiReactTimer = 0;
    this.aiDecision = null;

    this.hpEl = null;
    this.superEl = null;
    this.comboWrapEl = null;
    this.comboCountEl = null;

    this._loadSprite('idle');
  }

  bindHUD(side) {
    const suffix = side === 'left' ? 'p1' : 'p2';
    this.hpEl = document.getElementById(`health-${suffix}`);
    this.superEl = document.getElementById(`super-${suffix}`);
    this.comboWrapEl = document.getElementById(`combo-${suffix}`);
    this.comboCountEl = document.getElementById(`combo-count-${suffix}`);
  }

  _loadSprite(stateName) {
    if (!this.imgEl) return;
    const src = getSpriteWithFallback(this.id, stateName);
    if (this.imgEl.src !== src) this.imgEl.src = src;
  }

  _syncSprite() {
    const map = { 
      idle:'idle', walk:'walk', jump:'jump', punch:'punch',
      kick:'kick', block:'block', special:'special',
      hurt:'hurt', ko:'ko' 
    };
    this._loadSprite(map[this.state] || 'idle');

    if (this.wrapEl) {
      const base = this.side === 'right' ? -1 : 1;
      const flip = base * this.facing;
      const scaleX = flip < 0 ? -1 : 1;
      this.wrapEl.style.transform = `translateX(${this.x}px) scaleX(${scaleX})`;
    }
  }

  syncHUD() {
    if (this.hpEl) {
      const pct = Math.max(0, (this.hp / HP_MAX) * 100);
      this.hpEl.style.width = pct + '%';
      this.hpEl.classList?.toggle('danger', pct <= 25);
    }
    if (this.superEl) {
      this.superEl.style.width = Math.min(100, (this.superMeter / SUPER_MAX) * 100) + '%';
    }
  }

  get hitboxX() { return this.x - 55; }
  get hitboxW() { return 110; }
  get hitboxY() { return this.y - 220; }
  get hitboxH() { return 220; }

  getAttackBox(moveType) {
    const reach = 80;
    const bx = this.facing > 0 ? this.x + 20 : this.x - 20 - reach;
    const height = moveType === 'kick' ? 100 : 150;
    const yOff = moveType === 'kick' ? 60 : 20;
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
      const chip = dmgRaw * BLOCK_CHIP;
      this.hp = Math.max(0, this.hp - chip);
      this.blockstun = Math.floor(moveData.hitstun * 0.6);
      this.state = 'block';
      this.actionFrame = this.blockstun;
      this.vx = this.facing * -1.5;
    } else {
      this.hp = Math.max(0, this.hp - dmgRaw);
      this.hitstun = moveData.hitstun;
      this.actionFrame = this.hitstun;
      this.state = 'hurt';
      this.vx = -this.facing * (moveData.kb * 0.6);
      if (moveData.kb > 10 && this.onGround) this.vy = -5;
    }
    this.superMeter = Math.min(SUPER_MAX, this.superMeter + SUPER_PER_RECV);
    this.syncHUD();
    return dmgRaw;
  }

  update(opponent, inputSys, isPlayer1) {
    frameCount++;
    if (this.state === 'ko') {
      this._syncSprite();
      return;
    }

    if (this.actionFrame > 0) this.actionFrame--;
    if (this.comboTimer > 0) {
      this.comboTimer--;
    } else if (this.comboCount > 0) {
      this.comboCount = 0;
      if (this.comboWrapEl) this.comboWrapEl.classList.remove('active');
    }

    if (this.state === 'idle' || this.state === 'walk') {
      this.facing = opponent.x > this.x ? 1 : -1;
      this.facingLeft = this.facing === -1;
    }

    if (this.isAI) {
      this._doAI(opponent);
    } else {
      this._doInput(inputSys, isPlayer1);
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;

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

    if (this.x < WALL_L) { this.x = WALL_L; this.vx = 0; }
    if (this.x > WALL_R) { this.x = WALL_R; this.vx = 0; }

    if (Math.abs(this.x - opponent.x) < 80 && this.onGround && opponent.onGround) {
      const push = this.x < opponent.x ? -1.5 : 1.5;
      this.x += push;
    }

    this.vx *= 0.82;

    if (this.actionFrame <= 0 && this.state !== 'idle' &&
        this.state !== 'walk' && this.state !== 'jump' && this.state !== 'ko') {
      this.state = 'idle';
    }

    this._syncSprite();
    this.syncHUD();
  }

  _doInput(inputSys, isPlayer1) {
    if (this.actionFrame > 0 && (this.state === 'hurt' || this.state === 'block')) return;
    if (this.actionFrame > 0 && ['punch','kick','special'].includes(this.state)) return;

    const K = GameConfig.KEYS;

    this.isBlocking = inputSys.isKeyPressed(K.BLOCK) && this.onGround;
    if (this.isBlocking) {
      this.state = 'block';
      this.actionFrame = 2;
      this.vx *= 0.5;
      return;
    }

    if (inputSys.isKeyPressed(K.SPECIAL) && this.superMeter >= SUPER_MAX) {
      this._doAttack('special');
      this.superMeter = 0;
      return;
    }
    if (inputSys.isKeyPressed(K.BACK))  { this._doAttack('kick');  return; }
    if (inputSys.isKeyPressed(K.SELECT)) { this._doAttack('punch'); return; }

    if (inputSys.isKeyPressed(K.UP) && this.onGround) {
      this.vy = JUMP_VY;
      this.onGround = false;
      this.state = 'jump';
      this.actionFrame = 30;
    }

    let moving = false;
    if (inputSys.isKeyPressed(K.LEFT))  { this.vx = -this.walkSpeed; moving = true; }
    if (inputSys.isKeyPressed(K.RIGHT)) { this.vx =  this.walkSpeed; moving = true; }

    if (moving && this.onGround && this.state !== 'jump') {
      this.state = 'walk';
    } else if (!moving && this.state === 'walk') {
      this.state = 'idle';
    }
  }

  _doAttack(type) {
    const move = this.charData.moves[type];
    if (!move) return;
    this.state = type;
    this.actionFrame = move.startup + move.active + move.recovery;
    this._attackActiveStart = move.startup;
    this._attackActiveEnd = move.startup + move.active;
    this._attackType = type;
    this._hitLanded = false;
  }

  _doAI(opponent) {
    const diff = window._fightDifficulty || 'normal';
    const reactFrames = AI_REACT[diff] || 28;
    const aggression = AI_AGGRESSION[diff] || 0.55;

    this.aiReactTimer++;
    if (this.aiReactTimer < reactFrames) {
      this._executeAIDecision(opponent);
      return;
    }
    this.aiReactTimer = 0;

    const dist = Math.abs(this.x - opponent.x);
    const myHP = this.hp / HP_MAX;

    if (this.actionFrame > 0) return;

    const defendBias = diff === 'easy' ? 0.5 : diff === 'legend' ? 0.1 : 0.25;
    const shouldDefend = myHP < 0.3 && Math.random() < defendBias;

    if (shouldDefend) {
      this.aiDecision = { action: 'retreat', duration: reactFrames * 2 };
      return;
    }

    if (this.superMeter >= SUPER_MAX && dist < 200 && Math.random() < aggression) {
      this._doAttack('special');
      this.superMeter = 0;
      return;
    }

    if (dist > 250) {
      this.aiDecision = { action: 'approach', duration: reactFrames * 3 };
    } else if (dist < 90) {
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
    if (!this.aiDecision || this.actionFrame > 0) return;

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

  attackActiveThisFrame() {
    if (!this._attackType) return false;
    const move = this.charData.moves[this._attackType];
    if (!move) return false;
    const totalFrames = move.startup + move.active + move.recovery;
    const elapsed = totalFrames - this.actionFrame;
    return elapsed >= this._attackActiveStart &&
           elapsed < this._attackActiveEnd &&
           !this._hitLanded;
  }
}

// ─── Fighters ─────────────────────────────────────────────────
let p1, p2;
const input = new InputSystem();

// ─── Round tracking ───────────────────────────────────────────
const wins = { p1: 0, p2: 0 };

function initFighters() {
  // Use FightConfig from character.js (sessionStorage, key 'soukbrawl_fight')
  const cfg = { ...FightConfig.defaults, ...FightConfig.load() };
  window._fightDifficulty = cfg.difficulty;
  totalRounds = cfg.rounds || 3;
  countdown = cfg.timer || 60;

  const isVersus = cfg.mode === 'versus';

  const p1Data = ROSTER.find(c => c.id === (cfg.p1CharId || 'issam')) || ROSTER[0];
  const p2Data = ROSTER.find(c => c.id === (cfg.p2CharId || 'issam')) || ROSTER[0];

  // Your hook: new Fighter(wrapId, imgId, charData, startX, isFacingLeft, isAI)
  p1 = new Fighter('sprite-p1-wrap', 'sprite-p1', p1Data, 200, false, false);
  p2 = new Fighter('sprite-p2-wrap', 'sprite-p2', p2Data, 700, true, !isVersus);

  p1.bindHUD('left');
  p2.bindHUD('right');

  const snEl = document.querySelector('.hud-side.left .hud-name');
  const saEl = document.querySelector('.hud-side.left .hud-name-ar');
  const snEl2 = document.querySelector('.hud-side.right .hud-name');
  const saEl2 = document.querySelector('.hud-side.right .hud-name-ar');

  if (snEl) snEl.textContent = p1Data.name;
  if (saEl) saEl.textContent = p1Data.nameAr || '';
  if (snEl2) snEl2.textContent = p2Data.name;
  if (saEl2) saEl2.textContent = p2Data.nameAr || '';

  updateWinDots();
}

// ─── Round start ──────────────────────────────────────────────
function startRound() {
  gameState = 'intro';
  clearTimer();

  p1.x = 200; p1.y = GROUND_Y; p1.vx = 0; p1.vy = 0;
  p1.hp = HP_MAX; p1.state = 'idle'; p1.actionFrame = 0;
  p1.hitstun = 0; p1.blockstun = 0; p1.comboCount = 0;
  p1.superMeter = 0;

  p2.x = 700; p2.y = GROUND_Y; p2.vx = 0; p2.vy = 0;
  p2.hp = HP_MAX; p2.state = 'idle'; p2.actionFrame = 0;
  p2.hitstun = 0; p2.blockstun = 0; p2.comboCount = 0;
  p2.superMeter = 0;

  p1.syncHUD(); p2.syncHUD();

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

  const stageEl = document.querySelector('.stage-area');

  [{ attacker: p1, defender: p2 }, { attacker: p2, defender: p1 }].forEach(({ attacker, defender }) => {
    if (!attacker.attackActiveThisFrame()) return;

    const box = attacker.getAttackBox(attacker._attackType);
    if (defender.overlaps(box)) {
      attacker._hitLanded = true;
      const moveData = attacker.charData.moves[attacker._attackType];
      const dmg = defender.receiveHit(moveData);

      hitStopFrames = 4;
      screenShake(moveData.damage > 15 ? 10 : 5);
      if (stageEl) applyShake(stageEl);

      attacker.comboCount++;
      attacker.comboTimer = 60;
      if (attacker.comboWrapEl && attacker.comboCountEl) {
        attacker.comboCountEl.textContent = attacker.comboCount;
        attacker.comboWrapEl.classList.add('active');
      }

      attacker.superMeter = Math.min(SUPER_MAX, attacker.superMeter + SUPER_PER_HIT);
      attacker.syncHUD();

      if (defender.hp <= 0) {
        defender.hp = 0;
        defender.syncHUD();
        defender.state = 'ko';
        const winner = attacker === p1 ? 'p1' : 'p2';
        const perfect = attacker.hp === HP_MAX;
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
  const msg = `${char.name} WINS!`;

  showMessage(msg, 'ko-message', 99999);

  setTimeout(() => {
    const layer = document.getElementById('message-layer');
    if (!layer) return;
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;bottom:30px;left:50%;transform:translateX(-50%);
      font-size:8px;color:var(--gold-d);letter-spacing:2px;text-align:center;`;
    div.innerHTML = `<div style="margin-bottom:8px">${char.nameAr || ''}</div>
      <a href="index.html" style="color:var(--gold-l);text-decoration:none">PRESS Z — MAIN MENU</a>`;
    layer.appendChild(div);
  }, 2000);
}

// ─── Screen shake ─────────────────────────────────────────────
function screenShake(mag) {
  shakeFrames = 8;
  shakeMag = mag;
}

function applyShake(el) {
  if (!el) return;
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
function gameLoop(timestamp) {
  if (hitStopFrames > 0) {
    hitStopFrames--;
    requestAnimationFrame(gameLoop);
    return;
  }

  animFrameId = requestAnimationFrame(gameLoop);
  const stageEl = document.querySelector('.stage-area');

  if (gameState === 'paused' || gameState === 'intro' ||
      gameState === 'round_end' || gameState === 'game_end') {
    if (p1) p1._syncSprite();
    if (p2) p2._syncSprite();
    if (stageEl) applyShake(stageEl);
    return;
  }

  if (gameState !== 'fighting') return;

  input.update();
  p1.update(p2, input, true);
  p2.update(p1, input, false);

  p1._syncSprite();
  p2._syncSprite();

  checkHits();
  if (stageEl) applyShake(stageEl);
}

// ─── Boot ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
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
