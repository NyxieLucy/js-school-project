/* ══════════════════════════════════════════════════════════════
   SOUK BRAWL — fight.js
   Fight scene engine: health, timer, combos, rounds, pause
══════════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════════════
   FIGHT STATE
════════════════════════════════════════════ */
const fightState = {
  p1: { health: 100, super: 0, combo: 0, wins: 0 },
  p2: { health: 100, super: 0, combo: 0, wins: 0 },
  timer: 60,
  round: 1,
  maxRounds: 3,
  paused: false,
  fighting: false,
  roundActive: false,
  timerInterval: null,
  comboTimer: null,
};

/* ════════════════════════════════════════════
   DOM REFERENCES
════════════════════════════════════════════ */
const els = {
  healthP1:    document.getElementById('health-p1'),
  healthP2:    document.getElementById('health-p2'),
  superP1:     document.getElementById('super-p1'),
  superP2:     document.getElementById('super-p2'),
  timer:       document.getElementById('timer'),
  roundInd:    document.getElementById('round-indicator'),
  comboP1:     document.getElementById('combo-p1'),
  comboP2:     document.getElementById('combo-p2'),
  comboCountP1: document.getElementById('combo-count-p1'),
  comboCountP2: document.getElementById('combo-count-p2'),
  winsP1:      document.getElementById('wins-p1'),
  winsP2:      document.getElementById('wins-p2'),
  messageLayer: document.getElementById('message-layer'),
  pauseMenu:   document.getElementById('pause-menu'),
  stageName:   document.getElementById('stage-name-fight'),
  stageAr:     document.getElementById('stage-ar-fight'),
  spriteP1:    document.getElementById('sprite-p1'),
  spriteP2:    document.getElementById('sprite-p2'),
  spriteP1Wrap: document.getElementById('sprite-p1-wrap'),
  spriteP2Wrap: document.getElementById('sprite-p2-wrap'),
};

/* ════════════════════════════════════════════
   STAGE DATA
════════════════════════════════════════════ */
const STAGES = {
  djemaa:      { name: 'DJEMAA EL-FNA',      ar: 'ساحة جامع الفنا' },
  fes:         { name: 'MEDINA OF FES',      ar: 'مدينة فاس' },
  tangier:     { name: 'KASBAH TANGIER',     ar: 'طنجة' },
  agadir:      { name: 'AGADIR BEACH',       ar: 'أكادير' },
  chefchaouen: { name: 'CHEFCHAOUEN',        ar: 'شفشاون' },
  atlas:       { name: 'ATLAS MOUNTAINS',    ar: 'جبال الأطلس' },
};

/* ════════════════════════════════════════════
   MESSAGE SYSTEM
════════════════════════════════════════════ */
function showMessage(text, duration = 2000) {
  const msg = document.createElement('div');
  msg.className = 'fight-message';
  msg.textContent = text;
  els.messageLayer.appendChild(msg);

  setTimeout(() => {
    msg.classList.add('fade');
    setTimeout(() => msg.remove(), 500);
  }, duration);
}

function showKO() {
  const msg = document.createElement('div');
  msg.className = 'ko-message';
  msg.textContent = 'K.O.';
  els.messageLayer.appendChild(msg);
  return msg;
}

function showPerfect() {
  const msg = document.createElement('div');
  msg.className = 'perfect-message';
  msg.textContent = 'PERFECT!';
  els.messageLayer.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}

/* ════════════════════════════════════════════
   ROUND SYSTEM
════════════════════════════════════════════ */
function startRound() {
  fightState.roundActive = true;
  fightState.fighting = true;
  fightState.p1.health = 100;
  fightState.p2.health = 100;
  fightState.p1.super = 0;
  fightState.p2.super = 0;
  fightState.p1.combo = 0;
  fightState.p2.combo = 0;
  fightState.timer = 60;

  updateHUD();
  updateWinDots();
  hideCombos();

  const roundAr = ['الجولة الأولى', 'الجولة الثانية', 'الجولة الثالثة'];
  els.roundInd.innerHTML = `<div>ROUND ${fightState.round}</div><div class="round-ar">${roundAr[fightState.round - 1] || ''}</div>`;

  // "ROUND X" then "FIGHT!"
  showMessage('ROUND ' + fightState.round, 1200);
  setTimeout(() => {
    showMessage('FIGHT!', 1500);
    startTimer();

    // Start idle animations
    if (animators.p1Fight) animators.p1Fight.play('idle');
    if (animators.p2Fight) animators.p2Fight.play('idle');
  }, 1400);
}

function endRound(winner) {
  fightState.roundActive = false;
  fightState.fighting = false;
  clearInterval(fightState.timerInterval);

  if (winner === 'p1') fightState.p1.wins++;
  if (winner === 'p2') fightState.p2.wins++;

  // Check perfect
  const winnerHealth = winner === 'p1' ? fightState.p1.health : fightState.p2.health;
  if (winnerHealth >= 100) {
    showPerfect();
  }

  const koMsg = showKO();
  updateWinDots();

  setTimeout(() => {
    koMsg.remove();

    if (fightState.p1.wins >= 2 || fightState.p2.wins >= 2 || fightState.round >= fightState.maxRounds) {
      endMatch();
    } else {
      fightState.round++;
      setTimeout(startRound, 2500);
    }
  }, 2500);
}

function endMatch() {
  const p1Won = fightState.p1.wins > fightState.p2.wins;
  const winner = p1Won ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
  const winnerAr = p1Won ? 'فاز اللاعب 1' : 'فاز اللاعب 2';

  const msg = document.createElement('div');
  msg.className = 'fight-message';
  msg.innerHTML = `<div>${winner}</div><div style="font-size:16px; color:var(--gold-l); margin-top:8px;">${winnerAr}</div>`;
  msg.style.animation = 'fight-zoom 1s ease-out forwards';
  els.messageLayer.appendChild(msg);

  setTimeout(() => {
    if (confirm('Play again? / العب مرة أخرى؟')) {
      resetMatch();
    } else {
      window.location.href = 'index.html';
    }
  }, 3000);
}

function resetMatch() {
  fightState.p1.wins = 0;
  fightState.p2.wins = 0;
  fightState.round = 1;
  document.querySelectorAll('.win-dot').forEach(d => d.classList.remove('active'));
  startRound();
}

/* ════════════════════════════════════════════
   TIMER
════════════════════════════════════════════ */
function startTimer() {
  clearInterval(fightState.timerInterval);
  els.timer.textContent = fightState.timer;
  els.timer.style.color = '';

  fightState.timerInterval = setInterval(() => {
    if (fightState.paused || !fightState.roundActive) return;

    fightState.timer--;
    els.timer.textContent = fightState.timer;

    if (fightState.timer <= 10) {
      els.timer.style.color = '#E03030';
    }

    if (fightState.timer <= 0) {
      clearInterval(fightState.timerInterval);
      // Time over — whoever has more health wins
      if (fightState.p1.health > fightState.p2.health) {
        endRound('p1');
      } else if (fightState.p2.health > fightState.p1.health) {
        endRound('p2');
      } else {
        showMessage('DRAW! / تعادل!', 2000);
        setTimeout(startRound, 2500);
      }
    }
  }, 1000);
}

/* ════════════════════════════════════════════
   MOVEMENT
════════════════════════════════════════════ */
function movePlayer(player, distance) {
  const wrap = player === 'p1' ? els.spriteP1Wrap : els.spriteP2Wrap;
  const animKey = player === 'p1' ? 'p1Fight' : 'p2Fight';
  const animator = animators[animKey];

  // HARD STOP: if busy (punching, kicking, etc.), can't move
  if (!animator || animator.isBusy()) {
    return;
  }

  const currentLeft = parseInt(wrap.style.left || '0');
  const newLeft = Math.max(-120, Math.min(120, currentLeft + distance));
  wrap.style.left = newLeft + 'px';
  wrap.style.position = 'relative';

  // Play walk animation
  if (fightState.roundActive && animator.current !== 'walk') {
    animator.play('walk');
  }
}

function stopMoving(player) {
  const animKey = player === 'p1' ? 'p1Fight' : 'p2Fight';
  const animator = animators[animKey];

  // Only return to idle if walking and NOT busy
  setTimeout(() => {
    if (animator && animator.current === 'walk' && !animator.isBusy()) {
      animator.play('idle');
    }
  }, 200);
}

function jumpPlayer(player) {
  const wrap = player === 'p1' ? els.spriteP1Wrap : els.spriteP2Wrap;
  const animKey = player === 'p1' ? 'p1Fight' : 'p2Fight';
  const animator = animators[animKey];

  // HARD STOP: if busy, can't jump
  if (!animator || animator.isBusy()) {
    return;
  }

  animator.play('jump', () => {
    if (animator && fightState.roundActive && !animator.isBusy()) {
      animator.play('idle');
    }
  });

  // Visual jump - slow, floaty
  wrap.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  const baseTransform = player === 'p2' ? 'scaleX(-1)' : '';
  const currentLeft = wrap.style.left || '0';
  wrap.style.transform = baseTransform + ' translateY(-60px)';
  wrap.style.left = currentLeft;

  setTimeout(() => {
    wrap.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.6, 1)';
    wrap.style.transform = baseTransform + ' translateY(0)';
    wrap.style.left = currentLeft;
  }, 800);
}

function crouchPlayer(player) {
  const wrap = player === 'p1' ? els.spriteP1Wrap : els.spriteP2Wrap;
  const animKey = player === 'p1' ? 'p1Fight' : 'p2Fight';
  const animator = animators[animKey];

  // HARD STOP: if busy, can't crouch
  if (!animator || animator.isBusy()) {
    return;
  }

  animator.play('crouch');

  // Visual crouch
  wrap.style.transition = 'transform 0.4s ease-out';
  const baseTransform = player === 'p2' ? 'scaleX(-1)' : '';
  const currentLeft = wrap.style.left || '0';
  wrap.style.transform = baseTransform + ' scaleY(0.72) translateY(35px)';
  wrap.style.left = currentLeft;

  // Auto-release after 900ms
  setTimeout(() => {
    wrap.style.transition = 'transform 0.5s ease-out';
    wrap.style.transform = baseTransform + ' scaleY(1) translateY(0)';
    wrap.style.left = currentLeft;
    if (animator && fightState.roundActive && !animator.isBusy()) {
      animator.play('idle');
    }
  }, 900);
}

/* ════════════════════════════════════════════
   COMBAT
════════════════════════════════════════════ */
function damage(target, amount, isCombo = false) {
  if (!fightState.roundActive) return;

  const victim = target === 'p1' ? fightState.p1 : fightState.p2;
  const attacker = target === 'p1' ? fightState.p2 : fightState.p1;

  victim.health = Math.max(0, victim.health - amount);
  attacker.super = Math.min(100, attacker.super + amount * 0.8);

  if (isCombo) {
    attacker.combo++;
    showCombo(attacker === fightState.p1 ? 'p1' : 'p2', attacker.combo);
  } else {
    attacker.combo = 1;
    showCombo(attacker === fightState.p1 ? 'p1' : 'p2', 1);
  }

  updateHUD();

  // Flash damage on health bar
  const bar = target === 'p1' ? els.healthP1 : els.healthP2;
  const originalBg = bar.style.background;
  bar.style.background = '#FFFFFF';
  setTimeout(() => {
    bar.style.background = '';
  }, 80);

  // Screen shake on heavy hits
  if (amount >= 15) {
    document.body.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
    setTimeout(() => document.body.style.transform = '', 100);
  }

  // Check KO
  if (victim.health <= 0) {
    endRound(target === 'p1' ? 'p2' : 'p1');
  }
}

function showCombo(player, count) {
  const display = player === 'p1' ? els.comboP1 : els.comboP2;
  const countEl = player === 'p1' ? els.comboCountP1 : els.comboCountP2;
  countEl.textContent = count;
  display.classList.add('active');

  clearTimeout(fightState.comboTimer);
  fightState.comboTimer = setTimeout(() => {
    hideCombos();
    fightState.p1.combo = 0;
    fightState.p2.combo = 0;
  }, 2000);
}

function hideCombos() {
  els.comboP1.classList.remove('active');
  els.comboP2.classList.remove('active');
}

/* ════════════════════════════════════════════
   HUD UPDATE
════════════════════════════════════════════ */
function updateHUD() {
  els.healthP1.style.width = fightState.p1.health + '%';
  els.healthP2.style.width = fightState.p2.health + '%';
  els.superP1.style.width = fightState.p1.super + '%';
  els.superP2.style.width = fightState.p2.super + '%';

  els.healthP1.classList.toggle('danger', fightState.p1.health < 20);
  els.healthP2.classList.toggle('danger', fightState.p2.health < 20);
}

function updateWinDots() {
  const p1Dots = els.winsP1.querySelectorAll('.win-dot');
  const p2Dots = els.winsP2.querySelectorAll('.win-dot');

  p1Dots.forEach((dot, i) => dot.classList.toggle('active', i < fightState.p1.wins));
  p2Dots.forEach((dot, i) => dot.classList.toggle('active', i < fightState.p2.wins));
}

/* ════════════════════════════════════════════
   PAUSE SYSTEM
════════════════════════════════════════════ */
function togglePause() {
  fightState.paused = !fightState.paused;
  els.pauseMenu.classList.toggle('active', fightState.paused);
}

/* ════════════════════════════════════════════
   CONTROLS
════════════════════════════════════════════ */
const keys = {};

document.addEventListener('keydown', e => {
  keys[e.key] = true;

  if (e.key === 'Escape') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (fightState.paused || !fightState.roundActive) return;

  // P1 controls — WASD to move, ZXCV to attack
  if (e.key === 'z' || e.key === 'Z') {
    e.preventDefault();
    performAttack('p1', 'punch', 8);
  }
  if (e.key === 'x' || e.key === 'X') {
    e.preventDefault();
    performAttack('p1', 'kick', 12);
  }
  if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    performAttack('p1', 'block', 0);
  }
  if (e.key === 'v' || e.key === 'V') {
    e.preventDefault();
    if (fightState.p1.super >= 50) {
      performAttack('p1', 'special', 25);
      fightState.p1.super = 0;
      updateHUD();
    }
  }
  // Movement: A/D or Arrow keys
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    e.preventDefault();
    movePlayer('p1', -6);
  }
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    e.preventDefault();
    movePlayer('p1', 6);
  }
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
    e.preventDefault();
    jumpPlayer('p1');
  }
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
    e.preventDefault();
    crouchPlayer('p1');
  }

  // P2 controls — J/L to move, U/O/P/; to attack
  if (e.key === 'u' || e.key === 'U') {
    e.preventDefault();
    performAttack('p2', 'punch', 8);
  }
  if (e.key === 'i' || e.key === 'I') {
    e.preventDefault();
    performAttack('p2', 'kick', 12);
  }
  if (e.key === 'o' || e.key === 'O') {
    e.preventDefault();
    performAttack('p2', 'block', 0);
  }
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (fightState.p2.super >= 50) {
      performAttack('p2', 'special', 25);
      fightState.p2.super = 0;
      updateHUD();
    }
  }
  // P2 Movement
  if (e.key === 'j' || e.key === 'J') {
    e.preventDefault();
    movePlayer('p2', -6);
  }
  if (e.key === 'l' || e.key === 'L') {
    e.preventDefault();
    movePlayer('p2', 6);
  }
  if (e.key === 'i' || e.key === 'I') {
    // Already used for kick above, skip
  }
  if (e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    crouchPlayer('p2');
  }
});

document.addEventListener('keyup', e => {
  keys[e.key] = false;

  // Stop walk animation when movement keys are released
  if (['a','A','d','D','ArrowLeft','ArrowRight'].includes(e.key)) {
    stopMoving('p1');
  }
  if (['j','J','l','L'].includes(e.key)) {
    stopMoving('p2');
  }
});

function performAttack(player, type, damageAmount) {
  const target = player === 'p1' ? 'p2' : 'p1';
  const wrap = player === 'p1' ? els.spriteP1Wrap : els.spriteP2Wrap;
  const targetWrap = player === 'p1' ? els.spriteP2Wrap : els.spriteP1Wrap;
  const animKey = player === 'p1' ? 'p1Fight' : 'p2Fight';
  const animator = animators[animKey];

  // HARD COOLDOWN: if busy, do NOTHING
  if (!animator || animator.isBusy()) {
    return;
  }

  // Visual attack lunge
  if (type !== 'block') {
    wrap.classList.add('attacking');
    setTimeout(() => wrap.classList.remove('attacking'), 700);
  }

  // Play animation - when done, auto-return to idle
  animator.play(type, () => {
    if (animator && fightState.roundActive && !animator.isBusy()) {
      animator.play('idle');
    }
  });

  // Target flinch
  if (damageAmount > 0) {
    targetWrap.style.transition = 'transform 0.2s';
    targetWrap.style.transform = player === 'p1' 
      ? 'scaleX(-1) translateX(-25px)' 
      : 'translateX(-25px)';
    setTimeout(() => {
      targetWrap.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)';
      targetWrap.style.transform = player === 'p1' ? 'scaleX(-1)' : '';
    }, 400);
  }

  // Apply damage
  if (damageAmount > 0) {
    setTimeout(() => {
      damage(target, damageAmount, true);
    }, 450);
  }
}

/* ════════════════════════════════════════════
   PAUSE MENU BUTTONS
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => togglePause());
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      togglePause();
      resetMatch();
    });
  }

  // Load stage from URL params
  const params = new URLSearchParams(window.location.search);
  const stageKey = params.get('stage') || 'djemaa';
  const stage = STAGES[stageKey] || STAGES.djemaa;

  const stageBgImg = document.getElementById('stage-bg-img');
  if (stageBgImg && stageKey) {
    stageBgImg.src = 'assets/stages/' + stageKey + '.png';
  }

  if (els.stageName) els.stageName.textContent = stage.name;
  if (els.stageAr) els.stageAr.textContent = stage.ar;

  // Init sprite animators
  if (els.spriteP1) {
    animators.p1Fight = new SpriteAnimator(els.spriteP1, ANIMATIONS.issam);
    animators.p1Fight.play('idle');
  }
  if (els.spriteP2) {
    animators.p2Fight = new SpriteAnimator(els.spriteP2, ANIMATIONS.issam);
    animators.p2Fight.play('idle');
  }

  // Start first round after brief delay
  setTimeout(() => {
    startRound();
  }, 800);
});
