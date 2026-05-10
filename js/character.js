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
    id: 'cheb-arbi',
    name: 'CHEB ARBI',
    nameAr: 'الشاب العربي',
    origin: 'ORAN / OUJDA',
    originAr: 'وجدة',
    bio: 'The Rai-fighter. His rhythm is as deadly as his right hook.',
    sprites: {
      idle:    'assets/characters/cheb-arbi/idle.png',
      walk:    'assets/characters/cheb-arbi/walking.png',
      jump:    'assets/characters/cheb-arbi/jumping.png',
      crouch:  'assets/characters/cheb-arbi/crouch.png',
      punch:   'assets/characters/cheb-arbi/punch1.png', 
      kick:    'assets/characters/cheb-arbi/kick.png',
      block:   'assets/characters/cheb-arbi/idle.png', // Use idle if you don't have block yet
      special: 'assets/characters/cheb-arbi/punch4.png', // Using punch4 as a placeholder special
      hurt:    'assets/characters/cheb-arbi/losing.png',
      ko:      'assets/characters/cheb-arbi/losing.png',
      win:     'assets/characters/cheb-arbi/winning.png',
    },
    stats: { speed: 10, power: 8, defense: 5, special: 9 },
    moves: {
      // Added hitstun and kb (knockback) so the engine doesn't break
      punch:   { startup: 3,  active: 3, recovery: 6,  damage: 10, hitstun: 10, kb: 3  },
      kick:    { startup: 5,  active: 4, recovery: 10, damage: 14, hitstun: 15, kb: 6  },
      special: { startup: 8,  active: 5, recovery: 15, damage: 25, hitstun: 30, kb: 15 },
    },
    superName: 'RAI RHYTHM',
    superNameAr: 'إيقاع الراي',
    color: '#F7B801',
    unlocked: true,
  }
];

// Fallback logic remains the same...
function getSpriteWithFallback(charId, state) {
  const char = ROSTER.find(c => c.id === charId);
  if (!char) return 'assets/characters/issam/idle.png';
  return char.sprites[state] || char.sprites.idle;
}

// FightConfig remains the same...
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
    mode: 'versus',
    difficulty: 'normal',
    rounds: 3,
    timer: 60,
  }
};