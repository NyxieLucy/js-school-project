// ═══════════════════════════════════════════════════════════════
// SOUK SLUGGER — Fight System
// Input handling, state machine, movement, and combat
// ═══════════════════════════════════════════════════════════════

const GAME_WIDTH = GameConfig.CANVAS.WIDTH;
const GAME_HEIGHT = GameConfig.CANVAS.HEIGHT;
const ROUND_TIME = 60;
const GROUND_Y = GameConfig.CANVAS.GROUND_Y;

// ─── Fighter State Machine ──────────────────────────────────────
const FighterState = {
  IDLE: 'idle',
  WALKING: 'walking',
  JUMPING: 'jumping',
  BLOCKING: 'blocking',
  PUNCHING: 'punching',
  KICKING: 'kicking',
  HIT: 'hit',
  KNOCKED_DOWN: 'knocked_down',
  WINNING: 'winning',
  LOSING: 'losing',
  ATTACKING: 'attacking',
  CROUCHING: 'crouching'
};

// ─── Fighter Class ──────────────────────────────────────────────
class Fighter {
  constructor(name, side, character = 'issam') {
    this.name = name;
    this.side = side;
    this.character = character;
    this.data = ROSTER.find(c => c.id === character) || ROSTER[0];

    const padding = GameConfig.CANVAS.STAGE_PADDING;
    this.x = side === 'left' ? padding * 2 : GAME_WIDTH - padding * 2;
    this.y = 0;
    this.minX = padding;
    this.maxX = GAME_WIDTH - padding;
    this.width = 100;
    this.height = 180;

    this.velocityY = 0;
    this.isGrounded = true;

    this.maxHealth = 100;
    this.health = 100;
    this.superMeter = 0;
    this.maxSuper = 100;
    this.combo = 0;
    this.comboTimer = 0;

    this.state = FighterState.IDLE;
    this.facing = side === 'left' ? 1 : -1;

    this.inputBuffer = [];
    this.inputWindow = 10;

    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 6;
    this.currentAnimation = 'idle';

    this.attackCooldown = 0;
    this.activeMove = null;
    this.moveFrame = 0;
    this.hitStun = 0;

    this.arenaElement = document.querySelector(`.arena-fighter.${side}`);
    this.spriteElement = document.getElementById(`sprite-${side === 'left' ? 'p1' : 'p2'}`);
    this.spriteWrap = document.getElementById(`sprite-${side === 'left' ? 'p1' : 'p2'}-wrap`);

    this.lastTapTime = { left: 0, right: 0 };
    this.isDashing = false;

    this.wins = 0;

    this.setupVisuals();
    this.updateHUDInfo();
  }

  updateHUDInfo() {
    const nameEl = document.getElementById(`${this.side === 'left' ? 'p1' : 'p2'}-name`);
    const nameArEl = document.getElementById(`${this.side === 'left' ? 'p1' : 'p2'}-name-ar`);
    if (nameEl) nameEl.textContent = this.data.name;
    if (nameArEl) nameArEl.textContent = this.data.nameAr;
  }

  resetForRound() {
    const padding = GameConfig.CANVAS.STAGE_PADDING;
    this.x = this.side === 'left' ? padding * 2 : GAME_WIDTH - padding * 2;
    this.y = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.health = this.maxHealth;
    this.superMeter = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.state = FighterState.IDLE;
    this.facing = this.side === 'left' ? 1 : -1;
    this.attackCooldown = 0;
    this.activeMove = null;
    this.moveFrame = 0;
    this.hitStun = 0;
    this.currentAnimation = 'idle';
    this.currentFrame = 0;
    this.frameTimer = 0;
    if (this.spriteWrap) {
      this.spriteWrap.classList.remove('blocking', 'attacking', 'hit', 'crouching');
    }
    this.updateVisuals();
  }

  addInput(key) {
    this.inputBuffer.push({ key, age: 0 });
    if (this.inputBuffer.length > 6) this.inputBuffer.shift();
  }

  updateInputBuffer() {
    for (let i = this.inputBuffer.length - 1; i >= 0; i--) {
      this.inputBuffer[i].age++;
      if (this.inputBuffer[i].age > this.inputWindow) {
        this.inputBuffer.splice(i, 1);
      }
    }
  }

  moveLeft() {
    if (this.state === FighterState.HIT || this.state === FighterState.KNOCKED_DOWN) return;
    if (!this.isGrounded && this.state !== FighterState.JUMPING) return;
    if (this.isGrounded &&
      (this.state === FighterState.IDLE || this.state === FighterState.WALKING || this.state === FighterState.BLOCKING)) {
      this.setState(FighterState.WALKING);
    }
    let speed = GameConfig.BALANCE.WALK_SPEED;
    if (this.isDashing) speed *= GameConfig.BALANCE.DASH_MULTIPLIER;
    this.x = Math.max(this.minX, this.x - speed);
    this.facing = -1;
  }

  moveRight() {
    if (this.state === FighterState.HIT || this.state === FighterState.KNOCKED_DOWN) return;
    if (!this.isGrounded && this.state !== FighterState.JUMPING) return;
    if (this.isGrounded &&
      (this.state === FighterState.IDLE || this.state === FighterState.WALKING || this.state === FighterState.BLOCKING)) {
      this.setState(FighterState.WALKING);
    }
    let speed = GameConfig.BALANCE.WALK_SPEED;
    if (this.isDashing) speed *= GameConfig.BALANCE.DASH_MULTIPLIER;
    this.x = Math.min(this.maxX, this.x + speed);
    this.facing = 1;
  }

  dash(direction) {
    if (!this.isGrounded) return;
    this.isDashing = true;
    if (this.state === FighterState.IDLE) {
      this.setState(FighterState.WALKING);
    }
  }

  stopDashing() {
    this.isDashing = false;
  }

  jump() {
    if (this.isGrounded &&
      this.state !== FighterState.HIT &&
      this.state !== FighterState.KNOCKED_DOWN &&
      this.state !== FighterState.PUNCHING &&
      this.state !== FighterState.KICKING) {
      this.velocityY = GameConfig.BALANCE.JUMP_FORCE;
      this.isGrounded = false;
      this.setState(FighterState.JUMPING);
    }
  }

  crouch() {
    if (this.isGrounded &&
      this.state !== FighterState.HIT &&
      this.state !== FighterState.KNOCKED_DOWN &&
      this.state !== FighterState.PUNCHING &&
      this.state !== FighterState.KICKING &&
      this.state !== FighterState.JUMPING) {
      this.setState(FighterState.CROUCHING);
    }
  }

  stopCrouching() {
    if (this.state === FighterState.CROUCHING) {
      this.setState(FighterState.IDLE);
    }
  }

  startMove(moveType) {
    const moveData = this.data.moves[moveType];
    if (this.canAttack() && moveData) {
      this.activeMove = {
        type: moveType,
        data: moveData,
        totalFrames: moveData.startup + moveData.active + moveData.recovery,
        hasHit: false
      };
      this.moveFrame = 0;
      if (moveType === 'punch') this.setState(FighterState.PUNCHING);
      else if (moveType === 'kick') this.setState(FighterState.KICKING);
      else this.setState(FighterState.ATTACKING);
      this.attackCooldown = this.activeMove.totalFrames;
      return true;
    }
    return false;
  }

  startBlocking() {
    if (this.state !== FighterState.BLOCKING &&
      this.state !== FighterState.PUNCHING &&
      this.state !== FighterState.KICKING &&
      this.state !== FighterState.HIT &&
      this.state !== FighterState.KNOCKED_DOWN &&
      this.state !== FighterState.JUMPING &&
      this.state !== FighterState.CROUCHING) {
      this.setState(FighterState.BLOCKING);
      return true;
    }
    return false;
  }

  stopBlocking() {
    if (this.state === FighterState.BLOCKING) {
      this.setState(FighterState.IDLE);
      return true;
    }
    return false;
  }

  canAttack() {
    return this.attackCooldown <= 0 &&
      this.state !== FighterState.HIT &&
      this.state !== FighterState.KNOCKED_DOWN &&
      this.state !== FighterState.BLOCKING &&
      this.state !== FighterState.CROUCHING;
  }

  takeDamage(amount, knockback = 10) {
    if (this.state === FighterState.BLOCKING) {
      amount *= 0.5;
      knockback *= 0.3;
    }
    this.health = Math.max(0, this.health - amount);
    this.superMeter = Math.min(this.maxSuper, this.superMeter + amount * 0.5);
    this.combo = 0;
    if (this.health <= 0) {
      this.setState(FighterState.LOSING);
    } else {
      this.setState(FighterState.HIT);
      this.hitStun = 8;
      const pushDirection = this.side === 'left' ? -1 : 1;
      this.x = Math.max(this.minX, Math.min(this.maxX, this.x + pushDirection * knockback));
    }
  }

  setState(newState) {
    if (this.state === newState) return;
    if (this.spriteWrap) {
      this.spriteWrap.classList.remove('blocking', 'attacking', 'hit', 'crouching');
    }
    this.state = newState;
    this.currentFrame = 0;
    this.frameTimer = 0;
    switch (newState) {
      case FighterState.IDLE: this.currentAnimation = 'idle'; break;
      case FighterState.WALKING: this.currentAnimation = this.data.walkCycle[0]; break;
      case FighterState.JUMPING: this.currentAnimation = 'jump'; break;
      case FighterState.BLOCKING: this.currentAnimation = 'block'; if (this.spriteWrap) this.spriteWrap.classList.add('blocking'); break;
      case FighterState.PUNCHING: this.currentAnimation = 'punch'; if (this.spriteWrap) this.spriteWrap.classList.add('attacking'); break;
      case FighterState.KICKING: this.currentAnimation = 'kick'; if (this.spriteWrap) this.spriteWrap.classList.add('attacking'); break;
      case FighterState.ATTACKING: this.currentAnimation = 'special'; if (this.spriteWrap) this.spriteWrap.classList.add('attacking'); break;
      case FighterState.HIT: this.currentAnimation = 'hurt'; if (this.spriteWrap) this.spriteWrap.classList.add('hit'); break;
      case FighterState.KNOCKED_DOWN: this.currentAnimation = 'ko'; break;
      case FighterState.CROUCHING: this.currentAnimation = 'crouch'; if (this.spriteWrap) this.spriteWrap.classList.add('crouching'); break;
      case FighterState.WINNING: this.currentAnimation = 'win'; break;
      case FighterState.LOSING: this.currentAnimation = 'ko'; break;
    }
  }

  updateAnimation() {
    this.frameTimer++;
    if (this.frameTimer >= this.frameDelay) {
      this.frameTimer = 0;
      this.currentFrame++;
    }
    if (this.state === FighterState.WALKING) {
      const walkCycle = this.data.walkCycle;
      const cycleIndex = this.currentFrame % walkCycle.length;
      this.currentAnimation = walkCycle[cycleIndex];
    }
    this.updateSpriteImage();
  }

  updateSpriteImage() {
    if (this.spriteElement) {
      this.spriteElement.src = getSpriteWithFallback(this.character, this.currentAnimation);
    }
  }

  update() {
    if (window.inputSystem) this.updateInputBuffer();
    this.updateAnimation();
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.activeMove) {
      this.moveFrame++;
      if (this.moveFrame >= this.activeMove.totalFrames) {
        this.activeMove = null;
        this.setState(FighterState.IDLE);
      }
    }
    if (this.hitStun > 0) this.hitStun--;
    if (this.comboTimer > 0) this.comboTimer--;
    else this.combo = 0;

    if (!this.isGrounded) {
      this.velocityY += GameConfig.BALANCE.GRAVITY;
      this.y += this.velocityY;
      if (this.y >= 0) {
        this.y = 0;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === FighterState.JUMPING) this.setState(FighterState.IDLE);
      }
    }
    if (this.isGrounded) this.y = 0;
    if (this.state === FighterState.HIT && this.hitStun <= 0) {
      this.setState(FighterState.IDLE);
    }

    const healthBar = document.getElementById(`health-${this.side === 'left' ? 'p1' : 'p2'}`);
    if (healthBar) {
      const healthPercent = (this.health / this.maxHealth) * 100;
      healthBar.style.width = healthPercent + '%';
      healthBar.classList.toggle('danger', this.health <= this.maxHealth * 0.25);
    }
    const superBar = document.getElementById(`super-${this.side === 'left' ? 'p1' : 'p2'}`);
    if (superBar) superBar.style.width = (this.superMeter / this.maxSuper) * 100 + '%';

    const comboDisplay = document.getElementById(`combo-${this.side === 'left' ? 'p1' : 'p2'}`);
    const comboCount = document.getElementById(`combo-count-${this.side === 'left' ? 'p1' : 'p2'}`);
    if (comboDisplay && comboCount) {
      comboDisplay.classList.toggle('active', this.combo > 1);
      if (this.combo > 1) comboCount.textContent = this.combo;
    }

    this.updateVisuals();
  }

  setupVisuals() {
    this.updateVisuals();
  }

  updateVisuals() {
    if (!this.arenaElement) return;
    const scale = window.innerHeight / GameConfig.CANVAS.HEIGHT;
    const arenaWidthPercent = (this.x / GAME_WIDTH) * 100;
    const floorPercent = (GROUND_Y / GAME_HEIGHT) * 100;
    const jumpOffset = -this.y * scale;
    this.arenaElement.style.left = arenaWidthPercent + '%';
    this.arenaElement.style.bottom = `calc(${100 - floorPercent}% + ${jumpOffset}px)`;
    if (this.spriteWrap) {
      const flip = this.facing;
      let transform = `translateX(-50%) scale(${scale * flip}, ${scale})`;
      if (this.state === FighterState.PUNCHING || this.state === FighterState.KICKING || this.state === FighterState.ATTACKING) {
        const lunge = 35 * scale;
        transform += ` translateX(${lunge * flip}px)`;
      }
      this.spriteWrap.style.transform = transform;
    }
  }
}

// ─── Game Controller ────────────────────────────────────────────
class FightGame {
  constructor() {
    const config = this.loadConfig();

    const p1Id = config.p1CharId || 'issam';
    let p2Id = config.p2CharId;

    if (!p2Id || p2Id === 'random') {
      const available = ROSTER.filter(c => c.id !== p1Id);
      p2Id = available[Math.floor(Math.random() * available.length)].id;
    }

    this.p1 = new Fighter('P1', 'left', p1Id);
    this.p2 = new Fighter('P2', 'right', p2Id);

    this.round = 1;
    this.maxRounds = config.rounds || 3;
    this.time = ROUND_TIME;
    this.gameActive = true;
    this.paused = false;
    this.keysPressed = {};
    this.timerInterval = null;
    this.roundEnded = false;
    this.hitStop = 0;
    this.isArcade = config.mode === 'arcade';

    this.setupEventListeners();
    this.startTimer();
    this.updateRoundDisplay();
    this.updateWinDots();
  }

  loadConfig() {
    // Try sessionStorage first (for versus/training), then localStorage (for arcade)
    let cfg = {};
    try {
      const session = sessionStorage.getItem('soukbrawl_fight');
      if (session) cfg = JSON.parse(session);
    } catch (e) { }
    // Merge with localStorage arcade selections
    try {
      const p1Arcade = localStorage.getItem('p1_selected_arcade');
      const p2Arcade = localStorage.getItem('p2_selected_arcade');
      const diff = localStorage.getItem('difficulty');
      if (p1Arcade) cfg.p1CharId = p1Arcade;
      if (p2Arcade && p2Arcade !== 'unknown') cfg.p2CharId = p2Arcade;
      if (diff) cfg.difficulty = diff;
      if (p1Arcade) cfg.mode = 'arcade';
    } catch (e) { }
    return cfg;
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', () => this.togglePause());
    if (restartBtn) restartBtn.addEventListener('click', () => this.restart());
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.togglePause();
      return;
    }
    if (this.paused || !this.gameActive) return;
    const key = e.key.toLowerCase();
    this.keysPressed[key] = true;

    if (key === GameConfig.KEYS_P1.LEFT || key === GameConfig.KEYS_P1.RIGHT) {
      const dir = key === GameConfig.KEYS_P1.LEFT ? 'left' : 'right';
      const now = Date.now();
      if (now - this.p1.lastTapTime[dir] < GameConfig.BALANCE.DASH_WINDOW) {
        this.p1.dash(dir);
      }
      this.p1.lastTapTime[dir] = now;
    }

    const p1k = GameConfig.KEYS_P1;
    if (key === p1k.UP) this.p1.jump();
    if (key === p1k.DOWN) this.p1.crouch();
    if (key === p1k.PUNCH) this.p1.startMove('punch');
    if (key === p1k.KICK) this.p1.startMove('kick');
    if (key === p1k.BLOCK) this.p1.startBlocking();
    if (key === p1k.SPECIAL) this.p1.startMove('special');

    const p2k = GameConfig.KEYS_P2;
    if (key === p2k.UP) this.p2.jump();
    if (key === p2k.DOWN) this.p2.crouch();
    if (key === p2k.PUNCH) this.p2.startMove('punch');
    if (key === p2k.KICK) this.p2.startMove('kick');
    if (key === p2k.BLOCK) this.p2.startBlocking();
    if (key === p2k.SPECIAL) this.p2.startMove('special');
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keysPressed[key] = false;
    if (key === GameConfig.KEYS_P1.LEFT || key === GameConfig.KEYS_P1.RIGHT) this.p1.stopDashing();
    if (key === GameConfig.KEYS_P2.LEFT || key === GameConfig.KEYS_P2.RIGHT) this.p2.stopDashing();
    if (key === GameConfig.KEYS_P1.BLOCK) this.p1.stopBlocking();
    if (key === GameConfig.KEYS_P2.BLOCK) this.p2.stopBlocking();
    if (key === GameConfig.KEYS_P1.DOWN) this.p1.stopCrouching();
    if (key === GameConfig.KEYS_P2.DOWN) this.p2.stopCrouching();
  }

  checkHits() {
    if (!this.gameActive || this.roundEnded) return;

    if (this.p1.activeMove && !this.p1.activeMove.hasHit) {
      const isHitFrame = this.p1.moveFrame >= this.p1.activeMove.data.startup &&
        this.p1.moveFrame < (this.p1.activeMove.data.startup + this.p1.activeMove.data.active);
      if (isHitFrame) {
        const hitConnected = this.resolveHit(this.p1, this.p2, this.p1.activeMove.type);
        if (hitConnected) this.p1.activeMove.hasHit = true;
      }
    }

    if (this.p2.activeMove && !this.p2.activeMove.hasHit) {
      const isHitFrame = this.p2.moveFrame >= this.p2.activeMove.data.startup &&
        this.p2.moveFrame < (this.p2.activeMove.data.startup + this.p2.activeMove.data.active);
      if (isHitFrame) {
        const hitConnected = this.resolveHit(this.p2, this.p1, this.p2.activeMove.type);
        if (hitConnected) this.p2.activeMove.hasHit = true;
      }
    }
  }

  resolveHit(attacker, defender, moveType) {
    const move = attacker.data.moves[moveType];
    if (this.isHit(attacker, defender, move.range)) {
      const comboMultiplier = 1 + (attacker.combo * 0.1);
      defender.takeDamage(Math.floor(move.damage * comboMultiplier), move.kb);
      attacker.combo++;
      attacker.comboTimer = 120;
      this.hitStop = GameConfig.BALANCE.HITSTOP_DURATION;
      this.showHitMessage(attacker.combo > 1 ? `${attacker.combo} HIT COMBO!` : 'HIT!', attacker.x, attacker.y);

      // Check for KO immediately after damage
      if (defender.health <= 0 && !this.roundEnded) {
        this.endRoundByKO(attacker, defender);
      }
      return true;
    }
    return false;
  }

  isHit(attacker, defender, reach) {
    const attackerFront = attacker.x + (attacker.width / 2) * attacker.facing;
    let attackStart, attackEnd;
    if (attacker.facing === 1) {
      attackStart = attackerFront;
      attackEnd = attackerFront + reach;
    } else {
      attackStart = attackerFront - reach;
      attackEnd = attackerFront;
    }
    const defenderLeft = defender.x - defender.width / 2;
    const defenderRight = defender.x + defender.width / 2;
    const overlap = attackStart < defenderRight && attackEnd > defenderLeft;
    const isInFront = attacker.facing === 1 ? defender.x > attacker.x : defender.x < attacker.x;
    return overlap && isInFront;
  }

  showHitMessage(text, x, y) {
    const layer = document.getElementById('message-layer');
    if (!layer) return;
    const msg = document.createElement('div');
    msg.className = 'fight-message';
    msg.textContent = text;
    msg.style.left = x + 'px';
    msg.style.top = (y - 50) + 'px';
    layer.appendChild(msg);
    requestAnimationFrame(() => {
      msg.classList.add('fade');
      setTimeout(() => msg.remove(), 500);
    });
  }

  startTimer() {
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      if (this.gameActive && !this.paused && !this.roundEnded) {
        if (this.time > 0) {
          this.time--;
          this.updateTimerDisplay();
        } else {
          this.endRoundByTime();
        }
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = this.time;
  }

  updateRoundDisplay() {
    const roundEl = document.getElementById('round-indicator');
    if (roundEl) {
      const roundAr = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];
      roundEl.innerHTML = `<div>ROUND ${this.round}</div><div class="round-ar">الجولة ${roundAr[this.round - 1] || this.round}</div>`;
    }
  }

  updateWinDots() {
    const p1Dots = document.querySelectorAll('#wins-p1 .win-dot');
    const p2Dots = document.querySelectorAll('#wins-p2 .win-dot');
    p1Dots.forEach((dot, i) => dot.classList.toggle('active', i < this.p1.wins));
    p2Dots.forEach((dot, i) => dot.classList.toggle('active', i < this.p2.wins));
  }

  endRoundByKO(winner, loser) {
    if (this.roundEnded) return;
    this.roundEnded = true;
    this.gameActive = false;
    clearInterval(this.timerInterval);

    winner.setState(FighterState.WINNING);
    loser.setState(FighterState.LOSING);
    winner.wins++;

    this.showMessage(`${winner.name} WINS!`);
    this.updateWinDots();

    // Check if match is over
    const winsNeeded = Math.ceil(this.maxRounds / 2);
    if (winner.wins >= winsNeeded) {
      setTimeout(() => this.showMatchOver(winner), 2000);
    } else {
      setTimeout(() => this.startNextRound(), 3000);
    }
  }

  endRoundByTime() {
    if (this.roundEnded) return;
    this.roundEnded = true;
    this.gameActive = false;
    clearInterval(this.timerInterval);

    let winner, loser;
    if (this.p1.health > this.p2.health) { winner = this.p1; loser = this.p2; }
    else if (this.p2.health > this.p1.health) { winner = this.p2; loser = this.p1; }
    else {
      this.showMessage('DRAW!');
      setTimeout(() => this.startNextRound(), 3000);
      return;
    }

    winner.setState(FighterState.WINNING);
    loser.setState(FighterState.LOSING);
    winner.wins++;
    this.showMessage(`${winner.name} WINS!`);
    this.updateWinDots();

    const winsNeeded = Math.ceil(this.maxRounds / 2);
    if (winner.wins >= winsNeeded) {
      setTimeout(() => this.showMatchOver(winner), 2000);
    } else {
      setTimeout(() => this.startNextRound(), 3000);
    }
  }

  startNextRound() {
    this.round++;
    this.time = ROUND_TIME;
    this.gameActive = true;
    this.roundEnded = false;
    this.hitStop = 0;
    this.p1.resetForRound();
    this.p2.resetForRound();
    this.updateRoundDisplay();
    this.updateTimerDisplay();
    this.clearMessages();
    this.startTimer();
  }

  showMatchOver(winner) {
    this.clearMessages();
    const layer = document.getElementById('message-layer');
    if (!layer) return;

    const msg = document.createElement('div');
    msg.className = 'perfect-message';
    msg.innerHTML = `<div>${winner.name}</div><div style="font-size:18px;margin-top:10px">WINS THE MATCH!</div>`;
    layer.appendChild(msg);

    // Show return options after delay
    setTimeout(() => {
      const overlay = document.getElementById('pause-menu');
      if (overlay) {
        overlay.querySelector('.pause-title').textContent = 'MATCH OVER';
        overlay.classList.add('active');
      }
    }, 2500);
  }

  showMessage(text) {
    const layer = document.getElementById('message-layer');
    if (!layer) return;
    this.clearMessages();
    const msg = document.createElement('div');
    msg.className = 'ko-message';
    msg.textContent = text;
    layer.appendChild(msg);
  }

  clearMessages() {
    const layer = document.getElementById('message-layer');
    if (layer) layer.innerHTML = '';
  }

  togglePause() {
    if (this.roundEnded) return;
    this.paused = !this.paused;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) {
      pauseMenu.querySelector('.pause-title').textContent = 'PAUSED';
      pauseMenu.classList.toggle('active');
    }
  }

  restart() {
    clearInterval(this.timerInterval);
    location.reload();
  }

  updateAI() {
    if (!this.isArcade || this.p2.state === FighterState.HIT || !this.gameActive || this.roundEnded) return;
    const dist = Math.abs(this.p1.x - this.p2.x);
    const p1Attacking = this.p1.state === FighterState.PUNCHING || this.p1.state === FighterState.KICKING;
    if (p1Attacking && dist < 200) {
      this.p2.startBlocking();
    } else {
      this.p2.stopBlocking();
      if (dist > 150) {
        if (this.p1.x < this.p2.x) this.p2.moveLeft();
        else this.p2.moveRight();
      } else {
        if (Math.random() < 0.05) {
          const move = Math.random() > 0.3 ? 'punch' : 'kick';
          this.p2.startMove(move);
        }
      }
    }
  }

  update() {
    if (this.paused) return;
    if (!this.gameActive && !this.roundEnded) return;

    if (window.inputSystem) window.inputSystem.update();
    if (this.hitStop > 0) { this.hitStop--; return; }
    if (this.isArcade) this.updateAI();

    const input = window.inputSystem;
    const p1Left = input ? input.isKeyPressed(GameConfig.KEYS_P1.LEFT) : this.keysPressed[GameConfig.KEYS_P1.LEFT];
    const p1Right = input ? input.isKeyPressed(GameConfig.KEYS_P1.RIGHT) : this.keysPressed[GameConfig.KEYS_P1.RIGHT];
    const p2Left = input ? input.isKeyPressed(GameConfig.KEYS_P2.LEFT) : this.keysPressed[GameConfig.KEYS_P2.LEFT];
    const p2Right = input ? input.isKeyPressed(GameConfig.KEYS_P2.RIGHT) : this.keysPressed[GameConfig.KEYS_P2.RIGHT];

    if (p1Left) this.p1.moveLeft();
    else if (p1Right) this.p1.moveRight();
    else if (this.p1.state === FighterState.WALKING && this.p1.isGrounded) this.p1.setState(FighterState.IDLE);

    if (p2Left) this.p2.moveLeft();
    else if (p2Right) this.p2.moveRight();
    else if (this.p2.state === FighterState.WALKING && this.p2.isGrounded) this.p2.setState(FighterState.IDLE);

    const minDistance = this.p1.width / 2 + this.p2.width / 2;
    if (Math.abs(this.p1.x - this.p2.x) < minDistance) {
      const midPoint = (this.p1.x + this.p2.x) / 2;
      this.p1.x = midPoint - minDistance / 2;
      this.p2.x = midPoint + minDistance / 2;
    }

    this.p1.update();
    this.p2.update();

    if (this.gameActive && !this.roundEnded) {
      this.checkHits();
    }
  }

  loop() {
    this.update();
    requestAnimationFrame(() => this.loop());
  }
}

// ─── Initialize ─────────────────────────────────────────────────
window.addEventListener('load', () => {
  const game = new FightGame();
  game.loop();
});
