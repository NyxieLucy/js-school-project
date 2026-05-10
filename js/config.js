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

  // Canvas settings
  CANVAS: {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
  },

  // Keyboard bindings
  KEYS: {
    SELECT: 'z',      // Menu selection / Attack
    BACK: 'x',        // Go back / Block
    UP: 'arrowup',
    DOWN: 'arrowdown',
    LEFT: 'arrowleft',
    RIGHT: 'arrowright',
  },

  // Game modes
  MODES: {
    ARCADE: 'arcade',
    VERSUS: 'versus',
    STORY: 'story',
    SURVIVAL: 'survival',
    TRAINING: 'training',
  },

  // Characters - Moroccan-inspired fighters
  CHARACTERS: {
    ISSAM: {
      id: 'issam',
      name: 'ISSAM',
      nameAR: 'عصام',
      origin: 'CASABLANCA',
      style: 'Balanced',
      description: 'A determined street fighter from the bustling markets',
      assets: {
        idle: 'assets/characters/issam/idle.png',
        attack: 'assets/characters/issam/attack.png',
        block: 'assets/characters/issam/block.png',
        hurt: 'assets/characters/issam/hurt.png',
        win: 'assets/characters/issam/win.png',
      },
      stats: {
        health: 100,
        attack: 15,
        defense: 10,
        speed: 12,
      },
    },
    // Add more characters as needed
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