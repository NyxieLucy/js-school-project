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
    this.side = side; // 'left' or 'right'
    this.character = character;
    
    // Load data from roster
    this.data = ROSTER.find(c => c.id === character) || ROSTER[0];

    // Position
    const padding = GameConfig.CANVAS.STAGE_PADDING;
    this.x = side === 'left' ? padding * 2 : GAME_WIDTH - padding * 2;
    this.y = 0; // Relative to GROUND_Y
    this.minX = padding;
    this.maxX = GAME_WIDTH - padding;
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

    // Action State
    this.attackCooldown = 0;
    this.activeMove = null;
    this.moveFrame = 0;
    this.hitStun = 0;

    // Visual
    this.spriteElement = document.getElementById(`sprite-p${side === 'left' ? 1 : 2}`);
    this.spriteWrap = document.getElementById(`sprite-p${side === 'left' ? 1 : 2}-wrap`);

    // Store initial X for transform offset calculation
    this.initialX = this.x;

    this.lastTapTime = { left: 0, right: 0 };
    this.isDashing = false;
    
    // Calculate visual scale based on window height vs logical height
    this.renderScale = window.innerHeight / GameConfig.CANVAS.HEIGHT;
    
    this.setupVisuals();
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
    // Dashing is visually handled by the walking animation but at higher speed
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

  // ─── Actions ────────────────────────────────────────────────
  startMove(moveType) {
    const moveData = this.data.moves[moveType];
    if (this.canAttack() && moveData) {
      this.activeMove = {
        type: moveType,
        data: moveData,
        totalFrames: moveData.startup + moveData.active + moveData.recovery,
        hasHit: false // New flag to prevent multi-hits
      };
      this.moveFrame = 0;
      
      if (moveType === 'punch') this.setState(FighterState.PUNCHING);
      else if (moveType === 'kick') this.setState(FighterState.KICKING);
      else this.setState(FighterState.ATTACKING);

      // cooldown is the total duration of the move
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
        this.currentAnimation = this.data.walkCycle[0];
        break;
      case FighterState.JUMPING:
        this.currentAnimation = 'jump';
        break;
      case FighterState.BLOCKING:
        this.currentAnimation = 'block';
        this.spriteWrap.classList.add('blocking');
        break;
      case FighterState.PUNCHING:
        this.currentAnimation = 'punch';
        this.spriteWrap.classList.add('attacking');
        break;
      case FighterState.KICKING:
        this.currentAnimation = 'kick';
        this.spriteWrap.classList.add('attacking');
        break;
      case FighterState.ATTACKING:
        this.currentAnimation = 'special';
        this.spriteWrap.classList.add('attacking');
        break;
      case FighterState.HIT:
        this.currentAnimation = 'hurt';
        this.spriteWrap.classList.add('hit');
        break;
      case FighterState.KNOCKED_DOWN:
        this.currentAnimation = 'ko';
        break;
      case FighterState.CROUCHING:
        this.currentAnimation = 'crouch';
        this.spriteWrap.classList.add('crouching');
        break;
      case FighterState.WINNING:
        this.currentAnimation = 'win';
        break;
      case FighterState.LOSING:
        this.currentAnimation = 'ko';
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
      const walkCycle = this.data.walkCycle;
      const cycleIndex = this.currentFrame % walkCycle.length;
      this.currentAnimation = walkCycle[cycleIndex];
    }

    this.updateSpriteImage();
  }

  updateSpriteImage() {
    this.spriteElement.src = getSpriteWithFallback(this.character, this.currentAnimation);
  }

  // ─── Update Loop ────────────────────────────────────────────
  update() {
    if (window.inputSystem) {
        this.updateInputBuffer();
    }
    this.updateAnimation();

    // Decay timers
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

    // Jump physics
    if (!this.isGrounded) {
      this.velocityY += GameConfig.BALANCE.GRAVITY;
      this.y += this.velocityY;

      if (this.y >= 0) {
        this.y = 0; // Fix: 0 is ground level relative to GROUND_Y
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === FighterState.JUMPING) {
          this.setState(FighterState.IDLE);
        }
      }
    }

    // Grounding cleanup (logical Y is relative to GROUND_Y)
    if (this.isGrounded) {
        this.y = 0;
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
    this.updateVisuals();
  }

  setupVisuals() {
    this.updateVisuals();
  }

  updateVisuals() {
    if (this.spriteWrap) {
      // Use height-based scaling to maintain aspect ratio
      const baseHeight = GameConfig.CANVAS.HEIGHT || 720;
      const scale = window.innerHeight / baseHeight;
      
      // visualX is centered in the arena
      const visualX = this.x;
      const visualY = GROUND_Y + this.y;

      // We incorporate the facing direction (mirroring) into the scaleX
      // Player 2 usually faces left (-1), Player 1 faces right (1)
      const flip = this.facing;

      this.spriteWrap.style.transform =
        `translate(${visualX}px, ${visualY}px) scale(${scale * flip}, ${scale})`;
    }
  }
}

// ─── Game Controller ────────────────────────────────────────────
class FightGame {
  constructor() {
    const config = FightConfig.load();
    
    const p1Id = config.p1CharId || 'issam';
    let p2Id = config.p2CharId;
    
    // If no P2 selected (e.g. Arcade mode), pick a random different character
    if (!p2Id || p2Id === 'random') {
        const available = ROSTER.filter(c => c.id !== p1Id);
        p2Id = available[Math.floor(Math.random() * available.length)].id;
    }

    this.p1 = new Fighter('P1', 'left', p1Id);
    this.p2 = new Fighter('P2', 'right', p2Id);
    
    this.round = 1;
    this.time = ROUND_TIME;
    this.gameActive = true;
    this.paused = false;
    this.keysPressed = {};
    this.timerInterval = null;
    
    this.hitStop = 0;
    this.isArcade = config.mode === 'arcade';

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
    
    // Dash Detection P1
    if (key === GameConfig.KEYS_P1.LEFT || key === GameConfig.KEYS_P1.RIGHT) {
      const dir = key === GameConfig.KEYS_P1.LEFT ? 'left' : 'right';
      const now = Date.now();
      if (now - this.p1.lastTapTime[dir] < GameConfig.BALANCE.DASH_WINDOW) {
        this.p1.dash(dir);
      }
      this.p1.lastTapTime[dir] = now;
    }

    // Player 1 Mapping
    const p1Keys = GameConfig.KEYS_P1;
    if (key === p1Keys.UP)      this.p1.jump();
    if (key === p1Keys.DOWN)    this.p1.crouch();
    if (key === p1Keys.PUNCH)   this.p1.startMove('punch');
    if (key === p1Keys.KICK)    this.p1.startMove('kick');
    if (key === p1Keys.BLOCK)   this.p1.startBlocking();
    if (key === p1Keys.SPECIAL) this.p1.startMove('special');

    // Player 2 Mapping
    const p2Keys = GameConfig.KEYS_P2;
    if (key === p2Keys.UP)      this.p2.jump();
    if (key === p2Keys.DOWN)    this.p2.crouch();
    if (key === p2Keys.PUNCH)   this.p2.startMove('punch');
    if (key === p2Keys.KICK)    this.p2.startMove('kick');
    if (key === p2Keys.BLOCK)   this.p2.startBlocking();
    if (key === p2Keys.SPECIAL) this.p2.startMove('special');
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keysPressed[key] = false;
    
    if (key === GameConfig.KEYS_P1.LEFT || key === GameConfig.KEYS_P1.RIGHT) this.p1.stopDashing();
    if (key === GameConfig.KEYS_P2.LEFT || key === GameConfig.KEYS_P2.RIGHT) this.p2.stopDashing();

    if (key === GameConfig.KEYS_P1.BLOCK) this.p1.stopBlocking();
    if (key === GameConfig.KEYS_P2.BLOCK) this.p2.stopBlocking();
    if (key === GameConfig.KEYS_P1.DOWN)  this.p1.stopCrouching();
    if (key === GameConfig.KEYS_P2.DOWN)  this.p2.stopCrouching();
  }

  // ─── Hitbox Detection & Damage ──────────────────────────────
  //
  //  HITBOX SYSTEM EXPLANATION:
  //  ──────────────────────────
  //  Each fighter has:
  //    • Body hitbox: the area where they can BE hit (centered on their position)
  //    • Attack hitbox: the area where their attack CAN hit (extends from their edge toward opponent)
  //
  //  Punch: short range, extends ~60px from attacker's front edge
  //  Kick:  longer range, extends ~100px from attacker's front edge
  //
  //  A hit connects when:
  //    1. The attacker's attack hitbox overlaps the defender's body hitbox
  //    2. The attacker is facing the defender
  //
  checkHits() {
    // P1 attacking P2
    if (this.p1.activeMove && !this.p1.activeMove.hasHit) {
      const isHitFrame = this.p1.moveFrame >= this.p1.activeMove.data.startup && 
                        this.p1.moveFrame < (this.p1.activeMove.data.startup + this.p1.activeMove.data.active);
      if (isHitFrame) {
          const hitConnected = this.resolveHit(this.p1, this.p2, this.p1.activeMove.type);
          if (hitConnected) this.p1.activeMove.hasHit = true;
      }
    }

    // P2 attacking P1
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
      this.hitStop = GameConfig.BALANCE.HITSTOP_DURATION; // Trigger impact freeze
      this.showHitMessage(attacker.combo > 1 ? `${attacker.combo} HIT COMBO!` : 'HIT!', attacker.x, attacker.y);
      return true;
    }
    return false;
  }

  //
  //  isHit(attacker, defender, reach)
  //  ─────────────────────────────────
  //  Checks if the attacker's attack hitbox overlaps the defender's body.
  //
  //  Attacker's front edge = attacker.x + (attacker.width/2) * attacker.facing
  //  Attack hitbox extends 'reach' pixels from that edge toward the defender.
  //
  //  Defender's body spans from (defender.x - defender.width/2) to (defender.x + defender.width/2)
  //
  isHit(attacker, defender, reach) {
    // Attacker's front edge (the side they're facing)
    const attackerFront = attacker.x + (attacker.width / 2) * attacker.facing;

    // Attack hitbox: extends 'reach' pixels from front edge in facing direction
    let attackStart, attackEnd;
    if (attacker.facing === 1) {
      // Facing right: hitbox goes from front edge to front edge + reach
      attackStart = attackerFront;
      attackEnd = attackerFront + reach;
    } else {
      // Facing left: hitbox goes from front edge - reach to front edge
      attackStart = attackerFront - reach;
      attackEnd = attackerFront;
    }

    // Defender's body hitbox
    const defenderLeft = defender.x - defender.width / 2;
    const defenderRight = defender.x + defender.width / 2;

    // Check overlap: attack hitbox must intersect defender's body
    const overlap = attackStart < defenderRight && attackEnd > defenderLeft;

    // Also verify attacker is actually facing the defender
    const isInFront = attacker.facing === 1
      ? defender.x > attacker.x
      : defender.x < attacker.x;

    return overlap && isInFront;
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

  // ─── Simple AI ──────────────────────────────────────────────
  updateAI() {
    if (!this.isArcade || this.p2.state === FighterState.HIT) return;

    const dist = Math.abs(this.p1.x - this.p2.x);
    const p1Attacking = this.p1.state === FighterState.PUNCHING || this.p1.state === FighterState.KICKING;

    // 1. Reactive Blocking
    if (p1Attacking && dist < 200) {
      this.p2.startBlocking();
    } else {
      this.p2.stopBlocking();

      // 2. Movement
      if (dist > 150) {
        if (this.p1.x < this.p2.x) this.p2.moveLeft();
        else this.p2.moveRight();
      } else {
        // 3. Attack when in range
        if (Math.random() < 0.05) {
          const move = Math.random() > 0.3 ? 'punch' : 'kick';
          this.p2.startMove(move);
        }
      }
    }
  }

  // ─── Main Update Loop ───────────────────────────────────────
  update() {
    if (!this.gameActive || this.paused) return;

    // Update global input state once per frame
    if (window.inputSystem) {
      window.inputSystem.update();
    }

    // Handle Hitstop (Visual freeze)
    if (this.hitStop > 0) {
      this.hitStop--;
      return; 
    }

    // Update CPU if needed
    if (this.isArcade) this.updateAI();

    const input = window.inputSystem;
    // Player 1 movement
    if (input.isKeyPressed(GameConfig.KEYS_P1.LEFT)) {
      this.p1.moveLeft();
    } else if (input.isKeyPressed(GameConfig.KEYS_P1.RIGHT)) {
      this.p1.moveRight();
    } else if (this.p1.state === FighterState.WALKING && this.p1.isGrounded) {
      this.p1.setState(FighterState.IDLE);
    }

    // Player 2 movement
    if (input.isKeyPressed(GameConfig.KEYS_P2.LEFT)) {
      this.p2.moveLeft();
    } else if (input.isKeyPressed(GameConfig.KEYS_P2.RIGHT)) {
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
