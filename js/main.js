/* ══════════════════════════════════════════════════════════════
   SOUK BRAWL — main.js
   Unified engine for all screens
   Handles: Background canvas, animations, screen-specific logic
══════════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════════════
   SPRITE DEFINITIONS
════════════════════════════════════════════ */
const ANIMATIONS = {
  issam: {
    idle:   { frames: ['assets/characters/issam/idle.png', 'assets/characters/issam/idle1.png'], fps: 4, loop: true },
    walk:   { frames: ['assets/characters/issam/walking1.png', 'assets/characters/issam/walking2.png', 'assets/characters/issam/walking3.png', 'assets/characters/issam/walking4.png'], fps: 8, loop: true },
    jump:   { frames: ['assets/characters/issam/jumping.png'], fps: 4, loop: false },
    crouch: { frames: ['assets/characters/issam/crouch.png'], fps: 4, loop: false },
    punch:  { frames: ['assets/characters/issam/punch.png'], fps: 6, loop: false },
    win:    { frames: ['assets/characters/issam/winning.png'], fps: 2, loop: false },
    lose:   { frames: ['assets/characters/issam/losing.png'], fps: 2, loop: false },
    special:{ frames: ['assets/characters/issam/special.png'], fps: 6, loop: false },
    kick:   { frames: ['assets/characters/issam/special.png'], fps: 6, loop: false },
    block:  { frames: ['assets/characters/issam/crouch.png'], fps: 4, loop: false },
  }
};

/* ════════════════════════════════════════════
   SPRITE ANIMATOR CLASS
════════════════════════════════════════════ */
class SpriteAnimator {
  constructor(el, animSet) {
    this.el       = el;
    this.animSet  = animSet;
    this.current  = null;
    this.frameIdx = 0;
    this.timer    = null;
  }

  play(name, onDone) {
    if (!this.animSet[name]) return;
    if (this.current === name && this.animSet[name].loop) return;

    clearInterval(this.timer);
    this.current  = name;
    this.frameIdx = 0;

    const anim  = this.animSet[name];
    const delay = Math.round(1000 / anim.fps);

    const tick = () => {
      if (!this.el) return;
      this.el.src = anim.frames[this.frameIdx];

      if (this.frameIdx < anim.frames.length - 1) {
        this.frameIdx++;
      } else {
        if (anim.loop) {
          this.frameIdx = 0;
        } else {
          clearInterval(this.timer);
          this.timer = null;
          if (onDone) onDone();
        }
      }
    };

    tick();
    this.timer = setInterval(tick, delay);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  destroy() {
    this.stop();
    this.el      = null;
    this.animSet = null;
  }
}

/* Registry */
const animators = {};

function stopAllAnimators() {
  Object.values(animators).forEach(a => a.destroy());
  for (const k in animators) delete animators[k];
}

/* ════════════════════════════════════════════
   ARCADE LADDER DATA
════════════════════════════════════════════ */
const ARCADE_ROUNDS = [
  { num: 1, left: 'EL GUERRAB', right: 'RIFIYA',    loc: 'DJEMAA EL-FNA',   boss: false },
  { num: 2, left: 'TAROUDANT',  right: 'BELHSEN',   loc: 'MEDINA OF FES',   boss: false },
  { num: 3, left: 'IBN B.',     right: 'EL GUERRAB', loc: 'KASBAH TANGIER', boss: false },
  { num: 4, left: 'LALLA Z.',   right: 'BELHSEN',   loc: 'AGADIR BEACH',    boss: false },
  { num: 5, left: 'RIFIYA',     right: 'IBN B.',    loc: 'CHEFCHAOUEN',     boss: false },
  { num: 6, left: 'TAROUDANT',  right: 'LALLA Z.',  loc: 'ATLAS MOUNTAINS', boss: false },
  { num: 7, left: 'ISSAM',      right: 'EL GUERRAB', loc: 'HASSAN II TOWER', boss: false },
  { num: 8, left: 'AL CAID',    right: '???',       loc: 'THRONE ROOM',     boss: true  },
];

/* ════════════════════════════════════════════
   STATE
════════════════════════════════════════════ */
const state = {
  selectedDiff:  'normal',
  activeRound:   0,
  credits:       3,
  menuIndex:     0,
  p1Ready:       false,
  p2Ready:       false,
  currentStage:  'djemaa',
};

/* ════════════════════════════════════════════
   ANIMATED BG CANVAS — scrolling zellige tiles
════════════════════════════════════════════ */
function initBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  let W, H, offset = 0;

  const TILE   = 40;
  const COLORS = ['#1A0800','#120600','#0F0500','#160900'];
  const ACCENT = '#2E1A06';

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cols = Math.ceil(W / TILE) + 2;
    const rows = Math.ceil(H / TILE) + 2;
    const ox   = -(offset % TILE);

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x  = c * TILE + ox;
        const y  = r * TILE;
        const ci = Math.abs((r + c) % COLORS.length);
        ctx.fillStyle = COLORS[ci];
        ctx.fillRect(x, y, TILE - 1, TILE - 1);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);            ctx.lineTo(x + TILE - 1, y + TILE - 1);
        ctx.moveTo(x + TILE - 1, y); ctx.lineTo(x, y + TILE - 1);
        ctx.stroke();
        if ((r + c) % 3 === 0) {
          ctx.fillStyle = '#3A2208';
          ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2 - 2, 4, 4);
        }
      }
    }

    offset += 0.4;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}

/* ════════════════════════════════════════════
   MAIN MENU ANIMATIONS
════════════════════════════════════════════ */
function initMainAnimations() {
  const heroImg = document.getElementById('hero-sprite-img');
  if (!heroImg) return;

  animators.hero = new SpriteAnimator(heroImg, ANIMATIONS.issam);
  animators.hero.play('idle');

  /* periodic tease: walk a bit, throw a punch, back to idle */
  function tease() {
    setTimeout(() => {
      if (!animators.hero || !animators.hero.el) return;
      animators.hero.play('walk');
      setTimeout(() => {
        if (!animators.hero || !animators.hero.el) return;
        animators.hero.play('punch', () => {
          if (!animators.hero || !animators.hero.el) return;
          animators.hero.play('idle');
          tease();
        });
      }, 1400);
    }, 4000 + Math.random() * 3000);
  }

  tease();
}

/* ════════════════════════════════════════════
   ARCADE HERO PANEL UPDATE
════════════════════════════════════════════ */
function updateArcadeHero() {
  const img = document.getElementById('arcade-hero-img');
  if (img && animators.arcadeHero) {
    animators.arcadeHero.play('idle');
  }
}

/* ════════════════════════════════════════════
   VS MODE PANEL UPDATES
════════════════════════════════════════════ */
function updateVsPanel(player, ready) {
  const overlay = document.querySelector(player === 'p1' ? '.p1-overlay' : '.p2-overlay');
  if (overlay) overlay.classList.toggle('hidden', ready);
}

/* ════════════════════════════════════════════
   ARCADE LADDER RENDERER
════════════════════════════════════════════ */
function renderArcadeLadder() {
  const list = document.getElementById('rounds-list');
  if (!list) return;
  list.innerHTML = '';

  ARCADE_ROUNDS.forEach((round, i) => {
    const isActive = i === state.activeRound;
    const isWon    = i <  state.activeRound;
    const isLocked = i >  state.activeRound;
    const wrap     = document.createElement('div');
    wrap.className = 'round-row-wrap';

    if (round.boss) {
      wrap.innerHTML = `
        <div class="round-label">FINAL BOSS</div>
        <div class="round-row final ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}">
          <div class="round-fighter boss">
            <div class="rf-name">${round.left}</div>
            <div class="rf-loc">${round.loc}</div>
          </div>
        </div>`;
    } else {
      wrap.innerHTML = `
        <div class="round-label">ROUND ${round.num} &mdash; ${round.loc}</div>
        <div class="round-row ${isActive ? 'active' : ''} ${isWon ? 'won' : ''} ${isLocked ? 'locked' : ''}">
          <div class="round-fighter ${isWon ? 'won' : ''}">
            <div class="rf-name">${round.left}</div>
          </div>
          <div class="round-node"><div class="node-pip"></div></div>
          <div class="round-fighter right ${isWon ? 'won' : ''}">
            <div class="rf-name">${round.right}</div>
          </div>
        </div>`;
    }
    list.appendChild(wrap);
  });
}

/* ════════════════════════════════════════════
   STAGE CAROUSEL (VS Mode)
════════════════════════════════════════════ */
function initStageCarousel() {
  const thumbs = document.querySelectorAll('.stage-thumb');
  const stageName = document.getElementById('stage-name');
  const stageAr = document.getElementById('stage-ar');
  const prevBtn = document.getElementById('stage-prev');
  const nextBtn = document.getElementById('stage-next');

  if (!thumbs.length) return;

  let currentIdx = 0;
  const stages = [...thumbs];

  function updateStage(idx) {
    stages.forEach((t, i) => t.classList.toggle('active', i === idx));
    const active = stages[idx];
    if (stageName) stageName.textContent = active.querySelector('.thumb-frame').textContent;
    if (stageAr) stageAr.textContent = active.dataset.ar || '';
    state.currentStage = active.dataset.stage;
    currentIdx = idx;
  }

  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => updateStage(idx));
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      updateStage((currentIdx - 1 + stages.length) % stages.length);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      updateStage((currentIdx + 1) % stages.length);
    });
  }
}

/* ════════════════════════════════════════════
   VS MODE — Player Ready System
════════════════════════════════════════════ */
function initVsMode() {
  const p1Panel = document.getElementById('p1-panel');
  const p2Panel = document.getElementById('p2-panel');

  if (!p1Panel || !p2Panel) return;

  const p1Overlay = p1Panel.querySelector('.p1-overlay');
  const p2Overlay = p2Panel.querySelector('.p2-overlay');

  // Click to toggle ready state
  p1Panel.addEventListener('click', () => {
    state.p1Ready = !state.p1Ready;
    if (p1Overlay) p1Overlay.classList.toggle('hidden', state.p1Ready);
    if (state.p1Ready && animators.p1) animators.p1.play('win');
  });

  p2Panel.addEventListener('click', () => {
    state.p2Ready = !state.p2Ready;
    if (p2Overlay) p2Overlay.classList.toggle('hidden', state.p2Ready);
    if (state.p2Ready && animators.p2) animators.p2.play('win');
  });

  // Animate both sprites
  const p1Img = document.getElementById('p1-sprite');
  const p2Img = document.getElementById('p2-sprite');

  if (p1Img) {
    animators.p1 = new SpriteAnimator(p1Img, ANIMATIONS.issam);
    animators.p1.play('idle');
  }
  if (p2Img) {
    animators.p2 = new SpriteAnimator(p2Img, ANIMATIONS.issam);
    animators.p2.play('idle');
  }
}

/* ════════════════════════════════════════════
   CHAPTER SELECT (Story Mode)
════════════════════════════════════════════ */
function initStoryMode() {
  const cards = document.querySelectorAll('.chapter-card');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('locked')) return;
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      // Update hero banner
      const chapter = card.dataset.chapter;
      const title = card.querySelector('.ch-title').textContent;
      const ar = card.querySelector('.ch-ar').textContent;
      const loc = card.querySelector('.ch-loc').textContent;

      const bannerTitle = document.querySelector('.sh-title');
      const bannerAr = document.querySelector('.sh-title-ar');
      const bannerCh = document.querySelector('.sh-chapter');

      if (bannerTitle) bannerTitle.textContent = title;
      if (bannerAr) bannerAr.textContent = ar;
      if (bannerCh) bannerCh.textContent = 'CHAPTER ' + chapter;
    });
  });
}

/* ════════════════════════════════════════════
   TRAINING MODE — Settings toggles
════════════════════════════════════════════ */
function initTrainingMode() {
  const settingRows = document.querySelectorAll('.setting-options');

  settingRows.forEach(row => {
    const buttons = row.querySelectorAll('.set-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update move display for dummy action
        const rowName = btn.closest('.setting-row').querySelector('.setting-name').textContent;
        if (rowName === 'Dummy Action') {
          const moveDisplay = document.getElementById('move-display');
          if (moveDisplay) moveDisplay.textContent = btn.textContent;
        }
      });
    });
  });

  // Animate training hero
  const trImg = document.getElementById('tr-hero-img');
  if (trImg) {
    animators.training = new SpriteAnimator(trImg, ANIMATIONS.issam);
    animators.training.play('idle');
  }
}

/* ════════════════════════════════════════════
   OPTIONS SCREEN — Toggles & Sliders
════════════════════════════════════════════ */
function initOptionsScreen() {
  // Button toggles
  document.querySelectorAll('.opt-value').forEach(group => {
    const buttons = group.querySelectorAll('.opt-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Sliders
  document.querySelectorAll('.opt-slider input[type="range"]').forEach(slider => {
    const valDisplay = slider.parentElement.querySelector('.slider-val');
    slider.addEventListener('input', () => {
      if (valDisplay) valDisplay.textContent = slider.value + '%';
    });
  });

  // Reset button
  const resetBtn = document.querySelector('.opt-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('.opt-btn').forEach((btn, idx) => {
        // Simple reset logic — in production you'd restore defaults properly
        if (idx === 0) btn.classList.add('active');
      });
      document.querySelectorAll('input[type="range"]').forEach(s => {
        s.value = 80;
        const disp = s.parentElement.querySelector('.slider-val');
        if (disp) disp.textContent = '80%';
      });
    });
  }
}

/* ════════════════════════════════════════════
   SURVIVAL MODE — Stats animation
════════════════════════════════════════════ */
function initSurvivalMode() {
  const heroImg = document.getElementById('sv-hero-img');
  if (heroImg) {
    animators.survival = new SpriteAnimator(heroImg, ANIMATIONS.issam);
    animators.survival.play('idle');
  }
}

/* ════════════════════════════════════════════
   MAIN MENU KEYBOARD NAV
════════════════════════════════════════════ */
const menuItems = () => [...document.querySelectorAll('#main-menu .menu-item')];

function highlightMenu(idx) {
  menuItems().forEach((el, i) => el.classList.toggle('active', i === idx));
  state.menuIndex = idx;
}

function initMainMenuNav() {
  const menu = document.getElementById('main-menu');
  if (!menu) return;

  document.addEventListener('keydown', e => {
    const items = menuItems();
    if (e.key === 'ArrowUp'   || e.key === 'w') {
      e.preventDefault();
      highlightMenu((state.menuIndex - 1 + items.length) % items.length);
    }
    if (e.key === 'ArrowDown' || e.key === 's') {
      e.preventDefault();
      highlightMenu((state.menuIndex + 1) % items.length);
    }
    if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') {
      const active = items[state.menuIndex];
      if (active) window.location.href = active.getAttribute('href');
    }
  });

  // Mouse hover
  menuItems().forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => highlightMenu(i));
  });
}

/* ════════════════════════════════════════════
   DIFFICULTY BUTTONS (Arcade)
════════════════════════════════════════════ */
function initDifficultyButtons() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedDiff = btn.dataset.diff;
    });
  });
}

/* ════════════════════════════════════════════
   START BUTTONS
════════════════════════════════════════════ */
function initStartButtons() {
  // Arcade start
  const arcadeStart = document.getElementById('start-arcade');
  if (arcadeStart) {
    arcadeStart.addEventListener('click', () => {
      window.location.href = 'fight.html?mode=arcade&diff=' + state.selectedDiff;
    });
  }

  // VS start
  const vsStart = document.getElementById('start-fight');
  if (vsStart) {
    vsStart.addEventListener('click', () => {
      if (!state.p1Ready || !state.p2Ready) {
        alert('Both players must press START!');
        return;
      }
      window.location.href = 'fight.html?mode=versus&stage=' + state.currentStage;
    });
  }

  // Story start
  const storyStart = document.getElementById('start-story');
  if (storyStart) {
    storyStart.addEventListener('click', () => {
      const activeChapter = document.querySelector('.chapter-card.active');
      const chapter = activeChapter?.dataset.chapter || '1';
      window.location.href = 'fight.html?mode=story&chapter=' + chapter;
    });
  }

  // Survival start
  const survivalStart = document.getElementById('start-survival');
  if (survivalStart) {
    survivalStart.addEventListener('click', () => {
      window.location.href = 'fight.html?mode=survival';
    });
  }

  // Training start
  const trainingStart = document.getElementById('start-training');
  if (trainingStart) {
    trainingStart.addEventListener('click', () => {
      window.location.href = 'fight.html?mode=training';
    });
  }
}

/* ════════════════════════════════════════════
   SCREEN DETECTION & INITIALIZATION
════════════════════════════════════════════ */
function detectScreen() {
  const path = window.location.pathname;
  if (path.includes('arcade')) return 'arcade';
  if (path.includes('versus')) return 'versus';
  if (path.includes('story')) return 'story';
  if (path.includes('survival')) return 'survival';
  if (path.includes('training')) return 'training';
  if (path.includes('options')) return 'options';
  return 'main';
}

function initScreen(screen) {
  switch(screen) {
    case 'main':
      initMainAnimations();
      initMainMenuNav();
      break;
    case 'arcade':
      renderArcadeLadder();
      initDifficultyButtons();
      initArcadeAnimations();
      break;
    case 'versus':
      initVsMode();
      initStageCarousel();
      break;
    case 'story':
      initStoryMode();
      initStoryAnimations();
      break;
    case 'survival':
      initSurvivalMode();
      initSurvivalAnimations();
      break;
    case 'training':
      initTrainingMode();
      initTrainingAnimations();
      break;
    case 'options':
      initOptionsScreen();
      break;
  }
}

/* ════════════════════════════════════════════
   GLOBAL INIT
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initBgCanvas();
  initStartButtons();

  const screen = detectScreen();
  initScreen(screen);
});
