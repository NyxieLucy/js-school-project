/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOUK BRAWL - Game Configuration
 * Central configuration for game settings, constants, and character data
 * ════════════════════════════════════════════════════════════════════════════
 */

const GameConfig = {
  // Game metadata
  TITLE: 'SOUK BRAWL',
  VERSION: '1.0.0',

  // UI Navigation (Defaults to P1 keys)
  get UI_KEYS() {
    return this.KEYS_P1;
  },

  // Logical Resolution (Game coordinates)
  CANVAS: {
    WIDTH: 1280,
    HEIGHT: 720,
    GROUND_Y: 600, // Logical Y position of the floor
    STAGE_PADDING: 100,
    VIEW_HEIGHT: window.innerHeight,
  },

  // Keyboard bindings
  KEYS_P1: {
    UP: 'arrowup',
    DOWN: 'arrowdown',
    LEFT: 'arrowleft',
    RIGHT: 'arrowright',
    PUNCH: 'z',
    KICK: 'x',
    BLOCK: 'c',
    SPECIAL: 'v',
  },
  KEYS_P2: {
    UP: 'i',
    DOWN: 'm',
    LEFT: 'j',
    RIGHT: 'l',
    PUNCH: 'u',
    KICK: 'p',
    BLOCK: 'k',
    SPECIAL: 'o',
  },

  // Game modes
  MODES: {
    ARCADE: 'arcade',
    VERSUS: 'versus',
    STORY: 'story',
    SURVIVAL: 'survival',
    TRAINING: 'training',
  },

  // Audio settings
  AUDIO: {
    MASTER_VOLUME: 0.8,
    MUSIC_VOLUME: 0.6,
    SFX_VOLUME: 0.8,
    MUTE: false,
  },

  // Visual settings
  GRAPHICS: {
    ANTIALIASING: true,
    PARTICLE_EFFECTS: true,
    SCREEN_SHAKE: true,
    BLUR_EFFECTS: true,
  },

  // Game balance
  BALANCE: {
    BASE_ROUND_TIME: 99,    // seconds
    KO_TIME: 3,             // seconds
    MAX_COMBOS: 10,
    HEALTH_REGEN_DELAY: 3000, // milliseconds
    
    // Physics
    GRAVITY: 0.8,
    JUMP_FORCE: -18,
    FRICTION: 0.15,
    WALK_SPEED: 6,
    DASH_MULTIPLIER: 1.5,
    DASH_WINDOW: 250,        // ms window for double tap
    HITSTOP_DURATION: 5,     // frames to freeze on hit
  },

  // AI Difficulty
  AI: {
    REACTION_SPEED: 15,      // frames before AI reacts
    AGGRESSION: 0.7,         // 0-1 chance to attack
  },

  // Storage keys
  STORAGE: {
    SETTINGS: 'soukbrawl_settings',
    HIGHSCORES: 'soukbrawl_highscores',
    UNLOCKED_CHARS: 'soukbrawl_unlocked_chars',
    STATS: 'soukbrawl_stats',
  },

  // Debug mode
  DEBUG: false,
};

// Log initialization
if (GameConfig.DEBUG) {
  console.log('🎮 SOUK BRAWL Configuration Loaded', GameConfig);
}

// Ensure configuration is globally accessible
if (typeof window !== 'undefined') {
  window.GameConfig = GameConfig;
}