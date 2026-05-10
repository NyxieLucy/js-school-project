/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOUK BRAWL - Input System
 * Handles keyboard, gamepad, and touch input
 * ════════════════════════════════════════════════════════════════════════════
 */

class InputSystem {
  constructor() {
    this.keys = {};
    this.previousKeys = {};
    this.gamepadConnected = false;
    this.gamepad = null;

    this.setupKeyboardInput();
    this.setupGamepadInput();
    this.setupTouchInput();
    this.buffer = [];
    this.bufferWindow = 20;
  }

  /**
   * Setup keyboard input listeners
   */
  setupKeyboardInput() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  /**
   * Handle key down event
   */
  onKeyDown(event) {
    const key = event.key.toLowerCase();
      this.buffer.push({ key, time: Date.now() });
      if (this.buffer.length > 10) this.buffer.shift();
  }

  /**
   * Handle key up event
   */
  onKeyUp(event) {
    const key = event.key.toLowerCase();
    this.keys[key] = false;
    Utils.Event.emit('input:keyup', { key });
  }

  /**
   * Check if key is currently pressed
   */
  isKeyPressed(key) {
    return this.keys[key.toLowerCase()] || false;
  }

  /**
   * Check if key was just pressed (single frame)
   */
  isKeyJustPressed(key) {
    const currentState = this.keys[key.toLowerCase()] || false;
    const previousState = this.previousKeys[key.toLowerCase()] || false;
    return currentState && !previousState;
  }

  /**
   * Check if key was just released (single frame)
   */
  isKeyJustReleased(key) {
    const currentState = this.keys[key.toLowerCase()] || false;
    const previousState = this.previousKeys[key.toLowerCase()] || false;
    return !currentState && previousState;
  }

  /**
   * Setup gamepad input listeners
   */
  setupGamepadInput() {
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
  }

  /**
   * Handle gamepad connection
   */
  onGamepadConnected(event) {
    this.gamepadConnected = true;
    this.gamepad = event.gamepad;
    console.log('🎮 Gamepad connected:', this.gamepad.id);
    Utils.Event.emit('input:gamepad-connected', { gamepad: this.gamepad });
  }

  /**
   * Handle gamepad disconnection
   */
  onGamepadDisconnected(event) {
    this.gamepadConnected = false;
    this.gamepad = null;
    console.log('🎮 Gamepad disconnected');
    Utils.Event.emit('input:gamepad-disconnected');
  }

  /**
   * Get gamepad input state
   */
  getGamepadInput() {
    if (!this.gamepadConnected) return null;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];

    if (!gamepad) return null;

    return {
      buttons: gamepad.buttons.map((btn) => btn.pressed),
      axes: gamepad.axes,
    };
  }

  /**
   * Setup touch input listeners
   */
  setupTouchInput() {
    document.addEventListener('touchstart', (e) => this.onTouchStart(e));
    document.addEventListener('touchmove', (e) => this.onTouchMove(e));
    document.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  /**
   * Handle touch start
   */
  onTouchStart(event) {
    const touches = event.touches;
    Utils.Event.emit('input:touch-start', { touches });
  }

  /**
   * Handle touch move
   */
  onTouchMove(event) {
    const touches = event.touches;
    Utils.Event.emit('input:touch-move', { touches });
  }

  /**
   * Handle touch end
   */
  onTouchEnd(event) {
    const touches = event.touches;
    Utils.Event.emit('input:touch-end', { touches });
  }

  /**
   * Update input state (call every frame)
   */
  update() {
    // Store previous key states
    this.previousKeys = { ...this.keys };

    // Update gamepad state
    if (this.gamepadConnected) {
      const input = this.getGamepadInput();
      if (input) {
        Utils.Event.emit('input:gamepad-update', input);
      }
    }
  }

  /**
   * Get direction input (returns normalized direction vector)
   */
  getDirectionInput() {
    const direction = { x: 0, y: 0 };

    // Keyboard input
    if (this.isKeyPressed(GameConfig.KEYS.UP)) direction.y -= 1;
    if (this.isKeyPressed(GameConfig.KEYS.DOWN)) direction.y += 1;
    if (this.isKeyPressed(GameConfig.KEYS.LEFT)) direction.x -= 1;
    if (this.isKeyPressed(GameConfig.KEYS.RIGHT)) direction.x += 1;

    // Normalize diagonal movement
    const magnitude = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (magnitude > 0) {
      direction.x /= magnitude;
      direction.y /= magnitude;
    }

    return direction;
  }

  /**
   * Check if confirm action (select key)
   */
  isConfirmPressed() {
    return this.isKeyPressed(GameConfig.KEYS.SELECT);
  }

  /**
   * Check if confirm action just pressed
   */
  isConfirmJustPressed() {
    return this.isKeyJustPressed(GameConfig.KEYS.SELECT);
  }

  /**
   * Check if back action (back key)
   */
  isBackPressed() {
    return this.isKeyPressed(GameConfig.KEYS.BACK);
  }

  /**
   * Check if back action just pressed
   */
  isBackJustPressed() {
    return this.isKeyJustPressed(GameConfig.KEYS.BACK);
  }

  /**
   * Clear all input state (useful for screen transitions)
   */
  clearInput() {
    this.keys = {};
    this.previousKeys = {};
  }
}

// Initialize input system
let inputSystem = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    inputSystem = new InputSystem();
    window.inputSystem = inputSystem;
  });
} else {
  inputSystem = new InputSystem();
  window.inputSystem = inputSystem;
}