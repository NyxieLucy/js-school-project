// ═══════════════════════════════════════════════════════════════
// SOUK SLUGGER — Fight System
// Input handling, state machine, movement, and combat
// ═══════════════════════════════════════════════════════════════

const GAME_WIDTH = 900;
const GAME_HEIGHT = 420;
const ROUND_TIME = 60;
const GROUND_Y = 0;

// ─── Animation Frames ───────────────────────────────────────────
const ANIMATIONS = {
  issam: {
    idle: 'assets/characters/issam/idle.png',
    idle1: 'assets/characters/issam/idle1.png',
    walking1: 'assets/characters/issam/walking1.png',
    walking2: 'assets/characters/issam/walking2.png',
    walking3: 'assets/characters/issam/walking3.png',
    walking4: 'assets/characters/issam/walking4.png',
    punch: 'assets/characters/issam/punch.png',
    kick: 'assets/characters/issam/kick.png',
    crouch: 'assets/characters/issam/crouch.png',
    jumping: 'assets/characters/issam/jumping.png',
    winning: 'assets/characters/issam/winning.png',
    losing: 'assets/characters/issam/losing.png'
  },
  'cheb-arbi': {
    idle: 'assets/characters/cheb-arbi/idle.png',
    walking: 'assets/characters/cheb-arbi/walking.png',
    punch1: 'assets/characters/cheb-arbi/punch3.png',
    kick: 'assets/characters/cheb-arbi/kick.png',
    jumping: 'assets/characters/cheb-arbi/jumping.png',
    winning: 'assets/characters/cheb-arbi/winning.png',
    losing: 'assets/characters/cheb-arbi/losing.png'
  }
};

// Walk cycle for each character
const WALK_CYCLES = {
  issam: ['walking1', 'walking2', 'walking3', 'walking4'],
  'cheb-arbi': ['walking', 'walking', 'walking', 'walking']
};

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
  CROUCHING: 'crouching'
};

// ─── Fighter Class ──────────────────────────────────────────────
class Fighter {
  constructor(name, side, character = 'issam') {
    this.name = name;
    this.side = side; // 'left' or 'right'
    this.character = character;

    // Position
    this.x = side === 'left' ? 150 : GAME_WIDTH - 150;
    this.y = GROUND_Y;
    this.minX = 50;
    this.maxX = GAME_WIDTH - 50;
    this.width = 100;
    this.height = 180;

    // Jump physics
    this.velocityY = 0;
    this.isGrounded = true;

    // Stats
    this.maxHealth = 100;
    this.health = 100;
    this.superMeter = 0;
    this.maxSuper = 100;
    this.combo = 0;
    this.comboTimer = 0;

    // State
    this.state = FighterState.IDLE;
    this.facing = side === 'left' ? 1 : -1;

    // Input
    this.inputBuffer = [];
    this.inputWindow = 10;

    // Animation
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 6;
    this.currentAnimation = 'idle';

    // Attack timers
    this.attackCooldown = 0;
    this.punchEndlag = 0;
    this.kickEndlag = 0;
    this.blockCooldown = 0;
    this.hitStun = 0;

    // Visual
    this.spriteElement = document.getElementById(`sprite-p${side === 'left' ? 1 : 2}`);
    this.spriteWrap = document.getElementById(`sprite-p${side === 'left' ? 1 : 2}-wrap`);

    // Store initial X for transform offset calculation
    this.initialX = this.x;
  }

  // ─── Input Handling ─────────────────────────────────────────
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

  // ─── Movement ───────────────────────────────────────────────
  moveLeft() {
    if (this.state === FighterState.HIT || this.state === FighterState.KNOCKED_DOWN) return;
    if (!this.isGrounded && this.state !== FighterState.JUMPING) return;

    if (this.isGrounded &&
        (this.state === FighterState.IDLE || this.state === FighterState.WALKING || this.state === FighterState.BLOCKING)) {
      this.setState(FighterState.WALKING);
    }

    this.x = Math.max(this.minX, this.x - 4);
    this.facing = -1;
  }

  moveRight() {
    if (this.state === FighterState.HIT || this.state === FighterState.KNOCKED_DOWN) return;
    if (!this.isGrounded && this.state !== FighterState.JUMPING) return;

    if (this.isGrounded &&
        (this.state === FighterState.IDLE || this.state === FighterState.WALKING || this.state === FighterState.BLOCKING)) {
      this.setState(FighterState.WALKING);
    }

    this.x = Math.min(this.maxX, this.x + 4);
    this.facing = 1;
  }

  jump() {
    if (this.isGrounded &&
        this.state !== FighterState.HIT &&
        this.state !== FighterState.KNOCKED_DOWN &&
        this.state !== FighterState.PUNCHING &&
        this.state !== FighterState.KICKING) {
      this.velocityY = -18;
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

  // ─── Actions ────────────────────────────────────────────────
  punch() {
    if (this.canAttack() && this.state !== FighterState.BLOCKING && this.state !== FighterState.CROUCHING) {
      this.setState(FighterState.PUNCHING);
      this.punchEndlag = 12;
      this.attackCooldown = 15;
      return true;
    }
    return false;
  }

  kick() {
    if (this.canAttack() && this.state !== FighterState.BLOCKING && this.state !== FighterState.CROUCHING) {
      this.setState(FighterState.KICKING);
      this.kickEndlag = 18;
      this.attackCooldown = 20;
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

  // ─── Damage & Knockback ──────────────────────────────────────
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

      // Push away from attacker using facing direction of attacker
      const pushDirection = this.side === 'left' ? -1 : 1;
      this.x = Math.max(this.minX, Math.min(this.maxX, this.x + pushDirection * knockback));
    }
  }

  // ─── State Management ────────────────────────────────────────
  setState(newState) {
    if (this.state === newState) return;

    // Clean up old state classes
    this.spriteWrap.classList.remove('blocking', 'attacking', 'hit', 'crouching');

    this.state = newState;
    this.currentFrame = 0;
    this.frameTimer = 0;

    switch (newState) {
      case FighterState.IDLE:
        this.currentAnimation = 'idle';
        break;
      case FighterState.WALKING:
        this.currentAnimation = WALK_CYCLES[this.character][0];
        break;
      case FighterState.JUMPING:
        this.currentAnimation = 'jumping';
        break;
      case FighterState.BLOCKING:
        this.currentAnimation = 'idle';
        this.spriteWrap.classList.add('blocking');
        break;
      case FighterState.PUNCHING:
        this.currentAnimation = this.character === 'cheb-arbi' ? 'punch1' : 'punch';
        this.spriteWrap.classList.add('attacking');
        break;
      case FighterState.KICKING:
        this.currentAnimation = 'kick';
        this.spriteWrap.classList.add('attacking');
        break;
      case FighterState.HIT:
        this.currentAnimation = 'idle';
        this.spriteWrap.classList.add('hit');
        break;
      case FighterState.CROUCHING:
        this.currentAnimation = 'crouch';
        this.spriteWrap.classList.add('crouching');
        break;
      case FighterState.WINNING:
        this.currentAnimation = 'winning';
        break;
      case FighterState.LOSING:
        this.currentAnimation = 'losing';
        break;
    }
  }

  // ─── Animation ──────────────────────────────────────────────
  updateAnimation() {
    this.frameTimer++;

    if (this.frameTimer >= this.frameDelay) {
      this.frameTimer = 0;
      this.currentFrame++;
    }

    if (this.state === FighterState.WALKING) {
      const walkCycle = WALK_CYCLES[this.character];
      const cycleIndex = this.currentFrame % walkCycle.length;
      this.currentAnimation = walkCycle[cycleIndex];
    }

    this.updateSpriteImage();
  }

  updateSpriteImage() {
    const animData = ANIMATIONS[this.character];
    if (animData && animData[this.currentAnimation]) {
      this.spriteElement.src = animData[this.currentAnimation];
    }
  }

  // ─── Update Loop ────────────────────────────────────────────
  update() {
    this.updateInputBuffer();
    this.updateAnimation();

    // Decay timers
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.punchEndlag > 0) this.punchEndlag--;
    if (this.kickEndlag > 0) this.kickEndlag--;
    if (this.blockCooldown > 0) this.blockCooldown--;
    if (this.hitStun > 0) this.hitStun--;
    if (this.comboTimer > 0) this.comboTimer--;
    else this.combo = 0;

    // Jump physics
    if (!this.isGrounded) {
      this.velocityY += 1.2; // gravity
      this.y += this.velocityY;

      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === FighterState.JUMPING) {
          this.setState(FighterState.IDLE);
        }
      }
    }

    // State transitions
    if (this.state === FighterState.PUNCHING && this.punchEndlag <= 0) {
      this.setState(FighterState.IDLE);
    }

    if (this.state === FighterState.KICKING && this.kickEndlag <= 0) {
      this.setState(FighterState.IDLE);
    }

    if (this.state === FighterState.HIT && this.hitStun <= 0) {
      this.setState(FighterState.IDLE);
    }

    // Update health bar
    const healthBar = document.getElementById(`health-p${this.side === 'left' ? 1 : 2}`);
    if (healthBar) {
      const healthPercent = (this.health / this.maxHealth) * 100;
      healthBar.style.width = healthPercent + '%';

      if (this.health <= this.maxHealth * 0.25) {
        healthBar.classList.add('danger');
      } else {
        healthBar.classList.remove('danger');
      }
    }

    // Update super meter
    const superBar = document.getElementById(`super-p${this.side === 'left' ? 1 : 2}`);
    if (superBar) {
      superBar.style.width = (this.superMeter / this.maxSuper) * 100 + '%';
    }

    // Update combo display
    const comboDisplay = document.getElementById(`combo-p${this.side === 'left' ? 1 : 2}`);
    const comboCount = document.getElementById(`combo-count-p${this.side === 'left' ? 1 : 2}`);

    if (comboDisplay && comboCount) {
      if (this.combo > 1) {
        comboDisplay.classList.add('active');
        comboCount.textContent = this.combo;
      } else {
        comboDisplay.classList.remove('active');
      }
    }

    // Sync visual position — X for movement, Y for jump arc
    // Use translate relative to initial position for cleaner positioning
    if (this.spriteWrap && this.spriteWrap.parentElement) {
      const offsetX = this.x - this.initialX;
      this.spriteWrap.parentElement.style.transform =
        `translateX(${offsetX}px) translateY(${this.y}px)`;
    }
  }
}

// ─── Game Controller ────────────────────────────────────────────
class FightGame {
  constructor() {
    this.p1 = new Fighter('ISSAM', 'left', 'issam');
    this.p2 = new Fighter('CHEB-ARBI', 'right', 'cheb-arbi');
    this.round = 1;
    this.time = ROUND_TIME;
    this.gameActive = true;
    this.paused = false;
    this.keysPressed = {};
    this.timerInterval = null;
    this.setupEventListeners();
    this.startTimer();
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

    if (this.paused) return;

    const key = e.key.toLowerCase();
    this.keysPressed[key] = true;

    // Prevent default for game keys to avoid browser scrolling/actions
    const gameKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'x', 'c', 'v',
                      'i', 'j', 'k', 'l', 'o', 'p', 'u'];
    if (gameKeys.includes(key)) {
      e.preventDefault();
    }

    // Player 1 — Arrow keys move, Z punch, X kick, C block, V special, ArrowUp jump, ArrowDown crouch
    if (key === 'arrowup')  this.p1.jump();
    if (key === 'arrowdown') this.p1.crouch();
    if (key === 'z')        this.p1.punch();
    if (key === 'x')        this.p1.kick();
    if (key === 'c')        this.p1.startBlocking();
    if (key === 'v')        this.p1.addInput('special');

    // Player 2 — J/L move, I jump, U punch, P kick, K block, O special, M crouch
    if (key === 'i')        this.p2.jump();
    if (key === 'm')        this.p2.crouch();
    if (key === 'u')        this.p2.punch();
    if (key === 'p')        this.p2.kick();
    if (key === 'k')        this.p2.startBlocking();
    if (key === 'o')        this.p2.addInput('special');
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keysPressed[key] = false;

    if (key === 'c') this.p1.stopBlocking();
    if (key === 'k') this.p2.stopBlocking();
    if (key === 'arrowdown') this.p1.stopCrouching();
    if (key === 'm') this.p2.stopCrouching();
  }

  // ─── Hitbox Detection & Damage ──────────────────────────────
  checkHits() {
    // P1 attacking P2
    if (this.p1.state === FighterState.PUNCHING && this.p1.punchEndlag === 11) {
      if (this.isHit(this.p1, this.p2, 80)) {
        const comboMultiplier = 1 + (this.p1.combo * 0.1);
        this.p2.takeDamage(Math.floor(8 * comboMultiplier), 15);
        this.p1.combo++;
        this.p1.comboTimer = 120;
        this.showHitMessage(this.p1.combo > 1 ? `${this.p1.combo} HIT COMBO!` : 'HIT!', this.p1.x, this.p1.y);
      }
    }

    if (this.p1.state === FighterState.KICKING && this.p1.kickEndlag === 17) {
      if (this.isHit(this.p1, this.p2, 120)) {
        const comboMultiplier = 1 + (this.p1.combo * 0.1);
        this.p2.takeDamage(Math.floor(12 * comboMultiplier), 25);
        this.p1.combo++;
        this.p1.comboTimer = 120;
        this.showHitMessage(this.p1.combo > 1 ? `${this.p1.combo} HIT COMBO!` : 'HIT!', this.p1.x, this.p1.y);
      }
    }

    // P2 attacking P1
    if (this.p2.state === FighterState.PUNCHING && this.p2.punchEndlag === 11) {
      if (this.isHit(this.p2, this.p1, 80)) {
        const comboMultiplier = 1 + (this.p2.combo * 0.1);
        this.p1.takeDamage(Math.floor(8 * comboMultiplier), 15);
        this.p2.combo++;
        this.p2.comboTimer = 120;
        this.showHitMessage(this.p2.combo > 1 ? `${this.p2.combo} HIT COMBO!` : 'HIT!', this.p2.x, this.p2.y);
      }
    }

    if (this.p2.state === FighterState.KICKING && this.p2.kickEndlag === 17) {
      if (this.isHit(this.p2, this.p1, 120)) {
        const comboMultiplier = 1 + (this.p2.combo * 0.1);
        this.p1.takeDamage(Math.floor(12 * comboMultiplier), 25);
        this.p2.combo++;
        this.p2.comboTimer = 120;
        this.showHitMessage(this.p2.combo > 1 ? `${this.p2.combo} HIT COMBO!` : 'HIT!', this.p2.x, this.p2.y);
      }
    }
  }

  isHit(attacker, defender, range) {
    const attackerCenter = attacker.x + attacker.width / 2;
    const defenderCenter = defender.x + defender.width / 2;

    const distance = Math.abs(attackerCenter - defenderCenter);

    const isInFront =
      attacker.facing === 1
        ? defenderCenter > attackerCenter
        : defenderCenter < attackerCenter;

    return distance < range && isInFront;
  }

  // ─── Messages ───────────────────────────────────────────────
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
      if (this.gameActive && !this.paused) {
        if (this.time > 0) {
          this.time--;
          this.updateTimerDisplay();
        } else {
          this.endRound();
        }
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (timerEl) {
      timerEl.textContent = this.time;
    }
  }

  endRound() {
    this.gameActive = false;
    clearInterval(this.timerInterval);

    if (this.p1.health <= 0) {
      this.p1.setState(FighterState.LOSING);
      this.p2.setState(FighterState.WINNING);
      this.showMessage('P2 WINS!');
    } else if (this.p2.health <= 0) {
      this.p2.setState(FighterState.LOSING);
      this.p1.setState(FighterState.WINNING);
      this.showMessage('P1 WINS!');
    } else if (this.p1.health > this.p2.health) {
      this.p1.setState(FighterState.WINNING);
      this.p2.setState(FighterState.LOSING);
      this.showMessage('P1 WINS!');
    } else if (this.p2.health > this.p1.health) {
      this.p2.setState(FighterState.WINNING);
      this.p1.setState(FighterState.LOSING);
      this.showMessage('P2 WINS!');
    } else {
      this.showMessage('DRAW!');
    }
  }

  showMessage(text) {
    const layer = document.getElementById('message-layer');
    if (!layer) return;
    const msg = document.createElement('div');
    msg.className = 'ko-message';
    msg.textContent = text;
    layer.appendChild(msg);
  }

  togglePause() {
    this.paused = !this.paused;
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.classList.toggle('active');
  }

  restart() {
    clearInterval(this.timerInterval);
    location.reload();
  }

  // ─── Main Update Loop ───────────────────────────────────────
  update() {
    if (!this.gameActive || this.paused) return;

    // Player 1 movement — ArrowLeft / ArrowRight
    if (this.keysPressed['arrowleft']) {
      this.p1.moveLeft();
    } else if (this.keysPressed['arrowright']) {
      this.p1.moveRight();
    } else if (this.p1.state === FighterState.WALKING && this.p1.isGrounded) {
      this.p1.setState(FighterState.IDLE);
    }

    // Player 2 movement — J / L
    if (this.keysPressed['j']) {
      this.p2.moveLeft();
    } else if (this.keysPressed['l']) {
      this.p2.moveRight();
    } else if (this.p2.state === FighterState.WALKING && this.p2.isGrounded) {
      this.p2.setState(FighterState.IDLE);
    }

    // Prevent fighters from crossing each other
    const minDistance = this.p1.width / 2 + this.p2.width / 2;
    if (Math.abs(this.p1.x - this.p2.x) < minDistance) {
      const midPoint = (this.p1.x + this.p2.x) / 2;
      this.p1.x = midPoint - minDistance / 2;
      this.p2.x = midPoint + minDistance / 2;
    }

    this.p1.update();
    this.p2.update();

    this.checkHits();
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
