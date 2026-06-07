// ═══════════════════════════════════════════════════════════
// SOUK BRAWL — Character Roster
// Used by: arcade.html, versus.html, fight.js
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
      idle: 'assets/characters/issam/idle.png',
      walk: 'assets/characters/issam/walking1.png',
      jump: 'assets/characters/issam/jumping.png',
      punch: 'assets/characters/issam/punch.png',
      kick: 'assets/characters/issam/kick.png',
      block: 'assets/characters/issam/idle.png',       // fallback: no block sprite yet
      special: 'assets/characters/issam/punch.png',    // fallback: no special sprite yet
      hurt: 'assets/characters/issam/losing.png',      // fallback: no hurt sprite yet
      ko: 'assets/characters/issam/losing.png',
      crouch: 'assets/characters/issam/crouch.png',
      win: 'assets/characters/issam/winning.png',
    },
    walkCycle: ['walk'],
    stats: { speed: 8, power: 7, defense: 6, special: 7 },
    moves: {
      punch: { startup: 4, active: 3, recovery: 8, damage: 8, hitstun: 12, kb: 4, range: 70 },
      kick: { startup: 7, active: 4, recovery: 12, damage: 12, hitstun: 18, kb: 7, range: 100 },
      special: { startup: 10, active: 6, recovery: 20, damage: 20, hitstun: 25, kb: 12, range: 150 },
    },
    superName: 'CASABLANCA RUSH',
    superNameAr: 'اندفاعة الدار البيضاء',
    color: '#C8503A',
    unlocked: true,
  },
  {
    id: 'naima',
    name: 'NAIMA',
    nameAr: 'نعيمة',
    origin: 'FES',
    originAr: 'فاس',
    bio: 'A swift fighter from the ancient medina. Her agility is unmatched.',
    sprites: {
      idle: 'assets/characters/naima/idle.png',
      walk: 'assets/characters/naima/walking.png',
      jump: 'assets/characters/naima/jump.png',
      punch: 'assets/characters/naima/punch1.png',
      kick: 'assets/characters/naima/punch2.png',      // fallback: no kick sprite yet
      block: 'assets/characters/naima/idle.png',         // fallback: no block sprite yet
      special: 'assets/characters/naima/punch4.png',   // fallback: no special sprite yet
      hurt: 'assets/characters/naima/losing.png',      // fallback: no hurt sprite yet
      ko: 'assets/characters/naima/losing.png',
      win: 'assets/characters/naima/winning.png',
      crouch: 'assets/characters/naima/crouch.png'
    },
    walkCycle: ['walk'],
    stats: { speed: 10, power: 5, defense: 5, special: 8 },
    moves: {
      punch: { startup: 3, active: 3, recovery: 6, damage: 7, hitstun: 10, kb: 3, range: 60 },
      kick: { startup: 5, active: 4, recovery: 10, damage: 10, hitstun: 15, kb: 5, range: 90 },
      special: { startup: 8, active: 5, recovery: 15, damage: 18, hitstun: 20, kb: 10, range: 120 },
    },
    color: '#00d9ff',
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
      idle: 'assets/characters/cheb-arbi/idle.png',
      walk: 'assets/characters/cheb-arbi/walking.png',
      jump: 'assets/characters/cheb-arbi/jumping.png',
      crouch: 'assets/characters/cheb-arbi/crouch.png',
      punch: 'assets/characters/cheb-arbi/punch1.png',
      kick: 'assets/characters/cheb-arbi/kick.png',
      block: 'assets/characters/cheb-arbi/idle.png',   // fallback: no block sprite yet
      special: 'assets/characters/cheb-arbi/punch4.png', // fallback: no special sprite yet
      hurt: 'assets/characters/cheb-arbi/losing.png',  // fallback: no hurt sprite yet
      ko: 'assets/characters/cheb-arbi/losing.png',
      win: 'assets/characters/cheb-arbi/winning.png',
    },
    walkCycle: ['walk'],
    stats: { speed: 10, power: 8, defense: 5, special: 9 },
    moves: {
      punch: { startup: 3, active: 3, recovery: 6, damage: 10, hitstun: 10, kb: 3, range: 80 },
      kick: { startup: 5, active: 4, recovery: 10, damage: 14, hitstun: 15, kb: 6, range: 110 },
      special: { startup: 8, active: 5, recovery: 15, damage: 25, hitstun: 30, kb: 15, range: 140 },
    },
    superName: 'RAI RHYTHM',
    superNameAr: 'إيقاع الراي',
    color: '#F7B801',
    unlocked: true,
  }
];

function getSpriteWithFallback(charId, state) {
  const char = ROSTER.find(c => c.id === charId);
  if (!char) return 'assets/characters/issam/idle.png';
  return char.sprites[state] || char.sprites.idle;
}

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
