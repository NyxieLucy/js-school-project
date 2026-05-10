// ═══════════════════════════════════════════════════════════
//  SOUK BRAWL — Character Roster
//  Used by: select.html, arcade.html, versus.html, fight.js
// ═══════════════════════════════════════════════════════════

const ROSTER = [
  {
    id: 'issam',
    name: 'ISSAM',
    nameAr: 'عصام',
    origin: 'CASABLANCA',
    originAr: 'الدار البيضاء',
    bio: 'A street fighter from the alleys of Casa. Fast hands, faster mouth.',
    sprites: {
      idle:    'assets/characters/issam/idle.png',
      walk:    'assets/characters/issam/walk.png',
      jump:    'assets/characters/issam/jump.png',
      punch:   'assets/characters/issam/punch.png',
      kick:    'assets/characters/issam/kick.png',
      block:   'assets/characters/issam/block.png',
      special: 'assets/characters/issam/special.png',
      hurt:    'assets/characters/issam/hurt.png',
      ko:      'assets/characters/issam/ko.png',
    },
    stats: { speed: 8, power: 7, defense: 6, special: 7 },
    // Move frame data: [startupFrames, activeFrames, recoveryFrames, damage, hitstun, knockback]
    moves: {
      punch:   { startup: 4,  active: 3, recovery: 8,  damage: 8,  hitstun: 12, kb: 4  },
      kick:    { startup: 7,  active: 4, recovery: 12, damage: 12, hitstun: 18, kb: 7  },
      special: { startup: 10, active: 6, recovery: 20, damage: 20, hitstun: 25, kb: 12 },
    },
    superName: 'CASABLANCA RUSH',
    superNameAr: 'اندفاعة الدار البيضاء',
    color: '#C8503A',
    unlocked: true,
  },
  {
    id: 'fatima',
    name: 'FATIMA',
    nameAr: 'فاطمة',
    origin: 'MARRAKECH',
    originAr: 'مراكش',
    bio: 'Herbalist by day, fighter by necessity. Her poisons hit harder than your punches.',
    sprites: {
      idle:    'assets/characters/fatima/idle.png',
      walk:    'assets/characters/fatima/walk.png',
      jump:    'assets/characters/fatima/jump.png',
      punch:   'assets/characters/fatima/punch.png',
      kick:    'assets/characters/fatima/kick.png',
      block:   'assets/characters/fatima/block.png',
      special: 'assets/characters/fatima/special.png',
      hurt:    'assets/characters/fatima/hurt.png',
      ko:      'assets/characters/fatima/ko.png',
    },
    stats: { speed: 9, power: 6, defense: 5, special: 9 },
    moves: {
      punch:   { startup: 3,  active: 2, recovery: 7,  damage: 7,  hitstun: 10, kb: 3  },
      kick:    { startup: 5,  active: 3, recovery: 10, damage: 10, hitstun: 15, kb: 5  },
      special: { startup: 8,  active: 8, recovery: 18, damage: 18, hitstun: 22, kb: 10 },
    },
    superName: 'SOUK STORM',
    superNameAr: 'عاصفة السوق',
    color: '#9B59B6',
    unlocked: true,
  },
  {
    id: 'omar',
    name: 'OMAR',
    nameAr: 'عمر',
    origin: 'FES',
    originAr: 'فاس',
    bio: 'Scholar-turned-wrestler. He reads your moves before you make them.',
    sprites: {
      idle:    'assets/characters/omar/idle.png',
      walk:    'assets/characters/omar/walk.png',
      jump:    'assets/characters/omar/jump.png',
      punch:   'assets/characters/omar/punch.png',
      kick:    'assets/characters/omar/kick.png',
      block:   'assets/characters/omar/block.png',
      special: 'assets/characters/omar/special.png',
      hurt:    'assets/characters/omar/hurt.png',
      ko:      'assets/characters/omar/ko.png',
    },
    stats: { speed: 5, power: 9, defense: 9, special: 6 },
    moves: {
      punch:   { startup: 8,  active: 5, recovery: 14, damage: 14, hitstun: 20, kb: 10 },
      kick:    { startup: 10, active: 6, recovery: 18, damage: 18, hitstun: 26, kb: 14 },
      special: { startup: 14, active: 8, recovery: 25, damage: 26, hitstun: 30, kb: 20 },
    },
    superName: 'MEDINA CRUSHER',
    superNameAr: 'سحق المدينة',
    color: '#2E86AB',
    unlocked: true,
  },
  {
    id: 'nadia',
    name: 'NADIA',
    nameAr: 'نادية',
    origin: 'TANGIER',
    originAr: 'طنجة',
    bio: 'Smuggler. Expert at getting in and out quickly — and hitting first.',
    sprites: {
      idle:    'assets/characters/nadia/idle.png',
      walk:    'assets/characters/nadia/walk.png',
      jump:    'assets/characters/nadia/jump.png',
      punch:   'assets/characters/nadia/punch.png',
      kick:    'assets/characters/nadia/kick.png',
      block:   'assets/characters/nadia/block.png',
      special: 'assets/characters/nadia/special.png',
      hurt:    'assets/characters/nadia/hurt.png',
      ko:      'assets/characters/nadia/ko.png',
    },
    stats: { speed: 10, power: 5, defense: 4, special: 8 },
    moves: {
      punch:   { startup: 2,  active: 2, recovery: 6,  damage: 6,  hitstun: 8,  kb: 2  },
      kick:    { startup: 4,  active: 2, recovery: 9,  damage: 9,  hitstun: 12, kb: 4  },
      special: { startup: 6,  active: 5, recovery: 14, damage: 15, hitstun: 18, kb: 8  },
    },
    superName: 'STRAIT BLITZ',
    superNameAr: 'إضراب المضيق',
    color: '#27AE60',
    unlocked: true,
  },
  {
    id: 'hassan',
    name: 'HASSAN',
    nameAr: 'حسن',
    origin: 'AGADIR',
    originAr: 'أكادير',
    bio: 'Fisherman built like a wave. Slow to start, impossible to stop.',
    sprites: {
      idle:    'assets/characters/hassan/idle.png',
      walk:    'assets/characters/hassan/walk.png',
      jump:    'assets/characters/hassan/jump.png',
      punch:   'assets/characters/hassan/punch.png',
      kick:    'assets/characters/hassan/kick.png',
      block:   'assets/characters/hassan/block.png',
      special: 'assets/characters/hassan/special.png',
      hurt:    'assets/characters/hassan/hurt.png',
      ko:      'assets/characters/hassan/ko.png',
    },
    stats: { speed: 4, power: 10, defense: 8, special: 5 },
    moves: {
      punch:   { startup: 10, active: 6, recovery: 16, damage: 18, hitstun: 22, kb: 14 },
      kick:    { startup: 14, active: 8, recovery: 22, damage: 24, hitstun: 30, kb: 18 },
      special: { startup: 18, active: 10, recovery: 30, damage: 32, hitstun: 35, kb: 25 },
    },
    superName: 'TIDAL WAVE',
    superNameAr: 'موجة المد',
    color: '#E67E22',
    unlocked: true,
  },
  {
    id: 'zara',
    name: 'ZARA',
    nameAr: 'زارا',
    origin: 'CHEFCHAOUEN',
    originAr: 'شفشاون',
    bio: 'The Blue City ghost. Nobody sees her coming. Or going.',
    sprites: {
      idle:    'assets/characters/zara/idle.png',
      walk:    'assets/characters/zara/walk.png',
      jump:    'assets/characters/zara/jump.png',
      punch:   'assets/characters/zara/punch.png',
      kick:    'assets/characters/zara/kick.png',
      block:   'assets/characters/zara/block.png',
      special: 'assets/characters/zara/special.png',
      hurt:    'assets/characters/zara/hurt.png',
      ko:      'assets/characters/zara/ko.png',
    },
    stats: { speed: 9, power: 7, defense: 6, special: 10 },
    moves: {
      punch:   { startup: 2,  active: 3, recovery: 5,  damage: 8},
      kick:    { startup: 4,  active: 4, recovery: 8, damage: 12 },
    },
    superName: 'BLUE MIST',
    superNameAr: 'الضباب الأزرق',
    color: '#5DADE2',
    unlocked: true,
  },
];

// Fallback: if a sprite image 404s, use the idle sprite
function getSpriteWithFallback(charId, state) {
  const char = ROSTER.find(c => c.id === charId);
  if (!char) return 'assets/characters/issam/idle.png';
  return char.sprites[state] || char.sprites.idle;
}

// Store/load fight config via sessionStorage
const FightConfig = {
  save(cfg) {
    sessionStorage.setItem('soukbrawl_fight', JSON.stringify(cfg));
  },
  load() {
    try {
      return JSON.parse(sessionStorage.getItem('soukbrawl_fight')) || {};
    } catch { return {}; }
  },
  defaults: {
    p1CharId: 'issam',
    p2CharId: 'issam',
    stage: 'djemaa',
    mode: 'versus',     // 'versus' | 'arcade' | 'training'
    difficulty: 'normal',
    rounds: 3,
    timer: 60,
  }
};