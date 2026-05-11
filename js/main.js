/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOUK BRAWL - Main Entry Point
 * Initializes the game and sets up global event listeners
 * ════════════════════════════════════════════════════════════════════════════
 */

class SoukBrawl {
  constructor() {
    this.version = GameConfig.VERSION;
    this.isInitialized = false;

    this.init();
  }

  /**
   * Initialize the game
   */
  init() {
    console.log(`🎮 ${GameConfig.TITLE} v${this.version} - Initializing...`);

    // Load saved settings
    this.loadSettings();

    // Setup event listeners
    this.setupEventListeners();

    // Setup performance monitoring
    this.setupPerformanceMonitoring();

    // Log successful initialization
    this.isInitialized = true;
    console.log('✅ Game initialized successfully');
  }

  /**
   * Load saved settings from localStorage
   */
  loadSettings() {
    const savedSettings = Utils.Storage.get(GameConfig.STORAGE.SETTINGS);

    if (savedSettings) {
      Object.assign(GameConfig.AUDIO, savedSettings.audio);
      Object.assign(GameConfig.GRAPHICS, savedSettings.graphics);
      Utils.Debug.log('Loaded saved settings:', savedSettings);
    } else {
      Utils.Debug.log('Using default settings');
    }
  }

  /**
   * Save current settings to localStorage
   */
  saveSettings() {
    const settings = {
      audio: GameConfig.AUDIO,
      graphics: GameConfig.GRAPHICS,
    };

    Utils.Storage.set(GameConfig.STORAGE.SETTINGS, settings);
    Utils.Debug.log('Settings saved');
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Handle visibility change
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

    // Handle before unload (save settings on exit)
    window.addEventListener('beforeunload', () => {
      this.saveSettings();
    });

    // Listen for custom events
    Utils.Event.on('menu:selected', (event) => {
      Utils.Debug.log('Menu item selected:', event.detail.action);
    });

    Utils.Event.on('menu:back', () => {
      Utils.Debug.log('Back action triggered');
    });

    // Handle gamepad connection
    Utils.Event.on('input:gamepad-connected', (event) => {
      console.log('🎮 Gamepad connected:', event.detail.gamepad.id);
    });

    Utils.Event.on('input:gamepad-disconnected', () => {
      console.log('🎮 Gamepad disconnected');
    });
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    GameConfig.CANVAS.WIDTH = window.innerWidth;
    GameConfig.CANVAS.HEIGHT = window.innerHeight;
    Utils.Debug.log('Window resized:', GameConfig.CANVAS);
  }

  /**
   * Handle visibility change
   */
  onVisibilityChange() {
    if (document.hidden) {
      console.log('⏸️  Game paused (window hidden)');
      this.saveSettings();
    } else {
      console.log('▶️  Game resumed');
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    if (!GameConfig.DEBUG) return;

    const stats = {
      fps: 0,
      lastTime: performance.now(),
      frames: 0,
    };

    setInterval(() => {
      const now = performance.now();
      const delta = now - stats.lastTime;
      stats.fps = Math.round(1000 / (delta / stats.frames));
      console.log(`📊 FPS: ${stats.fps}`);
      stats.frames = 0;
      stats.lastTime = now;
    }, 1000);

    // Count frames
    setInterval(() => {
      stats.frames++;
    }, 16); // ~60 FPS
  }

  /**
   * Accessibility: Announce screen reader messages
   */
  announce(message) {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    setTimeout(() => {
      announcer.remove();
    }, 1000);
  }

  /**
   * Get game state
   */
  getGameState() {
    return {
      version: this.version,
      isInitialized: this.isInitialized,
      settings: {
        audio: GameConfig.AUDIO,
        graphics: GameConfig.GRAPHICS,
      },
    };
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      Utils.Storage.remove(GameConfig.STORAGE.SETTINGS);
      location.reload();
    }
  }
}

// Initialize game when DOM is ready
// NEW — defer until all scripts parsed
let game = null;
window.addEventListener('DOMContentLoaded', () => {
  if (typeof Utils === 'undefined') {
    console.error('Utils not loaded! Check script order.');
    return;
  }
  game = new SoukBrawl();
  window.game = game;
});

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
  Utils.Event.emit('game:error', { error: event.error });
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  event.preventDefault();
});