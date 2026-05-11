// ═══════════════════════════════════════════════════════════════
// SOUK SLUGGER — Fight System
// Input handling, state machine, movement, and combat
// ═══════════════════════════════════════════════════════════════

const GAME_WIDTH = 900;
const GAME_HEIGHT = 420;
const ROUND_TIME = 60;

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
  'cheb-arbi': ['walking', 'walking', 'walking', 'walking'] // adjust if more frames exist
};

// ─── Fighter State Machine ──────────────────────────────────────
const FighterState = {
  IDLE: 'idle',
  WALKING: 'walking',
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
    this.y = 0;
    this.minX = 50;
    this.maxX = GAME_WIDTH - 50;
    
    // Stats
    this.maxHealth = 100;
    this.health = 100;
    this.superMeter = 0;
    this.maxSuper = 100;
    this.combo = 0;
    this.comboTimer = 0;
    
    // State
    this.state = FighterState.IDLE;
    this.facing = side === 'left' ? 1 : -1; // 1 for right-facing, -1 for left
    
    // Input
    this.inputBuffer = [];
    this.inputWindow = 10; // frames
    
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
  }
  
  // ─── Input Handling ─────────────────────────────────────────
  addInput(key) {
    this.inputBuffer.push({
      key,
      age: 0
    });
    
    // Keep buffer size reasonable
    if (this.inputBuffer.length > 6) this.inputBuffer.shift();
  }
  
  updateInputBuffer() {
    // Age all inputs
    for (let i = 0; i < this.inputBuffer.length; i++) {
      this.inputBuffer[i].age++;
      if (this.inputBuffer[i].age > this.inputWindow) {
        this.inputBuffer.splice(i, 1);
        i--;
      }
    }
  }
  
  // ─── Movement ───────────────────────────────────────────────
  moveLeft() {
    // Can't move while in hitstun or knocked down
    if (this.state === FighterState.HIT || this.state === FighterState.KNOCKED_DOWN) {
      return;
    }
    
    // Only set walking if currently idle or already walking
    if (this.state === FighterState.IDLE || this.state === FighterState.WALKING) {
      this.setState(FighterState.WALKING);
    }
    
    this.x = Math.max(this.minX, this.x - 4);
  }
  
  moveRight() {
    // Can't move while in hitstun or knocked down
    if (this.state === FighterState.HIT || this.state === FighterState.KNOCKED_DOWN) {
      return;
    }
    
    // Only set walking if currently idle or already walking
    if (this.state === FighterState.IDLE || this.state === FighterState.WALKING) {
      this.setState(FighterState.WALKING);
    }
    
    this.x = Math.min(this.maxX, this.x + 4);
  }
  
  // ─── Actions ────────────────────────────────────────────────
  punch() {
    if (this.canAttack() && this.state !== FighterState.BLOCKING) {
      this.setState(FighterState.PUNCHING);
      this.punchEndlag = 12;
      this.attackCooldown = 15;
      return true;
    }
    return false;
  }
  
  kick() {
    if (this.canAttack() && this.state !== FighterState.BLOCKING) {
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
        this.state !== FighterState.KICKING) {
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
           this.state !== FighterState.BLOCKING;
  }
  
  // ─── Damage & Knockback ──────────────────────────────────────
  takeDamage(amount, knockback = 10) {
    if (this.state === FighterState.BLOCKING) {
      amount *= 0.5; // Reduce damage while blocking
    }
    
    this.health = Math.max(0, this.health - amount);
    this.superMeter = Math.min(this.maxSuper, this.superMeter + amount * 0.5);
    this.combo = 0; // Reset attacker's combo on block/hit
    
    if (this.health <= 0) {
      this.setState(FighterState.LOSING);
    } else {
      this.setState(FighterState.HIT);
      this.hitStun = 8;
      
      // Knockback
      if (this.side === 'left') {
        this.x = Math.max(this.minX, this.x - knockback);
      } else {
        this.x = Math.min(this.maxX, this.x + knockback);
      }
    }
  }
  
  // ─── State Management ────────────────────────────────────────
  setState(newState) {
    if (this.state === newState) return;
    
    this.state = newState;
    this.currentFrame = 0;
    this.frameTimer = 0;
    
    // Set animation based on state
    switch (newState) {
      case FighterState.IDLE:
        this.currentAnimation = 'idle';
        break;
      case FighterState.WALKING:
        this.currentAnimation = 'walking1';
        break;
      case FighterState.BLOCKING:
        this.currentAnimation = 'idle'; // Use idle for block pose
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
      case FighterState.HIT:
        this.currentAnimation = 'idle';
        this.spriteWrap.classList.add('hit');
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
    
    // Handle walk cycling
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
    if (this.hitStun > 0) this.hitStun--;
    if (this.comboTimer > 0) this.comboTimer--;
    else this.combo = 0;
    
    // State transitions
    if (this.state === FighterState.PUNCHING && this.punchEndlag <= 0) {
      this.setState(FighterState.IDLE);
      this.spriteWrap.classList.remove('attacking');
    }
    
    if (this.state === FighterState.KICKING && this.kickEndlag <= 0) {
      this.setState(FighterState.IDLE);
      this.spriteWrap.classList.remove('attacking');
    }
    
    if (this.state === FighterState.HIT && this.hitStun <= 0) {
      this.setState(FighterState.IDLE);
      this.spriteWrap.classList.remove('hit');
    }
    
    // Return to idle from walk if no movement input
    if (this.state === FighterState.WALKING) {
      // This will be handled by the game controller checking if movement keys are pressed
    }
    
    // Update health bar
    const healthBar = document.getElementById(`health-p${this.side === 'left' ? 1 : 2}`);
    const healthPercent = (this.health / this.maxHealth) * 100;
    healthBar.style.width = healthPercent + '%';
    
    if (this.health <= this.maxHealth * 0.25) {
      healthBar.classList.add('danger');
    } else {
      healthBar.classList.remove('danger');
    }
    
    // Update super meter
    const superBar = document.getElementById(`super-p${this.side === 'left' ? 1 : 2}`);
    const superPercent = (this.superMeter / this.maxSuper) * 100;
    superBar.style.width = superPercent + '%';
    
    // Update combo display
    const comboDisplay = document.getElementById(`combo-p${this.side === 'left' ? 1 : 2}`);
    const comboCount = document.getElementById(`combo-count-p${this.side === 'left' ? 1 : 2}`);
    
    if (this.combo > 0) {
      comboDisplay.classList.add('active');
      comboCount.textContent = this.combo;
    } else {
      comboDisplay.classList.remove('active');
    }
    
    // Sync visual position to DOM
    this.spriteWrap.parentElement.style.transform = `translateX(${this.x - (this.side === 'left' ? 150 : GAME_WIDTH - 150)}px)`;
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
    this.blockingKeys = new Set();
    
    this.setupEventListeners();
    this.updateTimer();
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());
  }
  
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.togglePause();
      return;
    }
    
    if (this.paused) return;
    
    const key = e.key.toLowerCase();
    this.keysPressed[key] = true;
    
    // Prevent default for arrow keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
    }
    
    // Only trigger action keys on press (not movement)
    // Player 1 Controls
    if (key === 'z') {
      this.p1.punch();
    } else if (key === 'x') {
      this.p1.kick();
    } else if (key === 'c') {
      this.p1.startBlocking();
    } else if (key === 'v') {
      this.p1.addInput('special');
    }
    
    // Player 2 Controls
    if (key === 'u') {
      this.p2.punch();
    } else if (key === 'p') {
      this.p2.kick();
    } else if (key === 'k') {
      this.p2.startBlocking();
    } else if (key === 'l') {
      this.p2.addInput('special');
    }
  }
  
  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keysPressed[key] = false;
    
    // Release blocks
    if (key === 'c') this.p1.stopBlocking();
    if (key === 'k') this.p2.stopBlocking();
  }
  
  // ─── Hitbox Detection & Damage ──────────────────────────────
  checkHits() {
    // P1 attacking P2
    if (this.p1.state === FighterState.PUNCHING && this.p1.punchEndlag === 11) {
      if (this.isHit(this.p1, this.p2, 80)) {
        const damage = 8;
        this.p2.takeDamage(damage, 15);
        this.p1.combo++;
        this.p1.comboTimer = 120;
        this.showHitMessage('HIT!', this.p1.x, this.p1.y);
      }
    }
    
    if (this.p1.state === FighterState.KICKING && this.p1.kickEndlag === 17) {
      if (this.isHit(this.p1, this.p2, 120)) {
        const damage = 12;
        this.p2.takeDamage(damage, 25);
        this.p1.combo++;
        this.p1.comboTimer = 120;
        this.showHitMessage('HIT!', this.p1.x, this.p1.y);
      }
    }
    
    // P2 attacking P1
    if (this.p2.state === FighterState.PUNCHING && this.p2.punchEndlag === 11) {
      if (this.isHit(this.p2, this.p1, 80)) {
        const damage = 8;
        this.p1.takeDamage(damage, -15);
        this.p2.combo++;
        this.p2.comboTimer = 120;
        this.showHitMessage('HIT!', this.p2.x, this.p2.y);
      }
    }
    
    if (this.p2.state === FighterState.KICKING && this.p2.kickEndlag === 17) {
      if (this.isHit(this.p2, this.p1, 120)) {
        const damage = 12;
        this.p1.takeDamage(damage, -25);
        this.p2.combo++;
        this.p2.comboTimer = 120;
        this.showHitMessage('HIT!', this.p2.x, this.p2.y);
      }
    }
  }
  
  isHit(attacker, defender, range) {
    const distance = Math.abs(attacker.x - defender.x);
    return distance < range;
  }
  
  // ─── Messages ───────────────────────────────────────────────
  showHitMessage(text, x, y) {
    const layer = document.getElementById('message-layer');
    const msg = document.createElement('div');
    msg.className = 'fight-message';
    msg.textContent = text;
    msg.style.left = x + 'px';
    msg.style.top = y + 'px';
    layer.appendChild(msg);
    
    setTimeout(() => {
      msg.classList.add('fade');
      setTimeout(() => msg.remove(), 500);
    }, 300);
  }
  
  updateTimer() {
    const timerEl = document.getElementById('timer');
    timerEl.textContent = this.time;
    
    if (this.gameActive && !this.paused) {
      if (this.time > 0) {
        setTimeout(() => {
          this.time--;
          this.updateTimer();
        }, 1000);
      } else {
        this.endRound();
      }
    }
  }
  
  endRound() {
    this.gameActive = false;
    
    if (this.p1.health <= 0) {
      this.showMessage('P2 WINS!');
    } else if (this.p2.health <= 0) {
      this.showMessage('P1 WINS!');
    } else if (this.p1.health > this.p2.health) {
      this.showMessage('P1 WINS!');
    } else if (this.p2.health > this.p1.health) {
      this.showMessage('P2 WINS!');
    } else {
      this.showMessage('DRAW!');
    }
  }
  
  showMessage(text) {
    const layer = document.getElementById('message-layer');
    const msg = document.createElement('div');
    msg.className = 'ko-message';
    msg.textContent = text;
    layer.appendChild(msg);
  }
  
  togglePause() {
    this.paused = !this.paused;
    document.getElementById('pause-menu').classList.toggle('active');
    
    if (!this.paused) {
      this.updateTimer();
    }
  }
  
  restart() {
    location.reload();
  }
  
  // ─── Main Update Loop ───────────────────────────────────────
  update() {
    if (!this.gameActive || this.paused) return;
    
    // Handle continuous movement based on held keys
    // Player 1
    if (this.keysPressed['arrowleft']) {
      this.p1.moveLeft();
    } else if (this.keysPressed['arrowright']) {
      this.p1.moveRight();
    } else if (this.p1.state === FighterState.WALKING) {
      // Return to idle if no movement key pressed
      this.p1.setState(FighterState.IDLE);
    }
    
    // Player 2
    if (this.keysPressed['i']) {
      this.p2.moveLeft();
    } else if (this.keysPressed['o']) {
      this.p2.moveRight();
    } else if (this.p2.state === FighterState.WALKING) {
      // Return to idle if no movement key pressed
      this.p2.setState(FighterState.IDLE);
    }
    
    // Update both fighters
    this.p1.update();
    this.p2.update();
    
    // Check for hits
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