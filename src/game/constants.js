// Constants & Configurations for Alto's Odyssey inspired game

export const PHYSICS = {
  GRAVITY: 0.38,
  SLOPE_ACCEL: 0.55,
  FRICTION: 0.992,
  AIR_RESISTANCE: 0.998,
  BASE_SPEED: 7.5,
  MAX_SPEED: 23.0,
  BOOST_SPEED: 32.0,
  JUMP_FORCE: -10.8,
  SUPER_JUMP_FORCE: -14.2,
  ROTATION_SPEED: 0.082, // radians per frame while holding flip
  MAX_FALL_SPEED: 26.0,
  PERFECT_LANDING_ANGLE: 0.32, // ~18 degrees
  SAFE_LANDING_ANGLE: 0.72,    // ~41 degrees
  CRASH_ANGLE: 1.15,           // > ~66 degrees difference crashes unless boost
  SCARF_SEGMENTS: 16,
  BASE_SCARF_LENGTH: 22,
  MAX_SCARF_LENGTH: 90
};

export const GAME_CONFIG = {
  EXPEDITION_DURATION: 120, // 2 minutes in seconds
  DAY_NIGHT_CYCLE_DURATION: 120 // Complete day-night cycle across the 2 minutes
};

export const BIOMES = [
  {
    id: 'dunes',
    name: 'The Endless Dunes',
    skyTop: '#ff9a76',
    skyBottom: '#ffd3b6',
    mountainFar: '#c27685',
    mountainMid: '#9e5374',
    duneFar: '#d17b58',
    duneMid: '#e28859',
    duneFront: '#f39c6b',
    sunColor: '#fff5eb',
    hasWater: false,
    balloonChance: 0.35,
    ropeChance: 0.4
  },
  {
    id: 'canyons',
    name: 'The Great Canyons',
    skyTop: '#6b4c78',
    skyBottom: '#d0717b',
    mountainFar: '#4b3259',
    mountainMid: '#5c3960',
    duneFar: '#a64f59',
    duneMid: '#c05c65',
    duneFront: '#d6686e',
    sunColor: '#fed1b0',
    hasWater: false,
    balloonChance: 0.5,
    ropeChance: 0.65
  },
  {
    id: 'oasis',
    name: 'The Lost Oasis',
    skyTop: '#3a7bd5',
    skyBottom: '#90e0ef',
    mountainFar: '#2b5876',
    mountainMid: '#3a6073',
    duneFar: '#56a798',
    duneMid: '#69bca9',
    duneFront: '#e5ad68',
    sunColor: '#fff8db',
    hasWater: true,
    balloonChance: 0.6,
    ropeChance: 0.45
  },
  {
    id: 'twilight',
    name: 'Starlit Sanctuary',
    skyTop: '#111030',
    skyBottom: '#3d2645',
    mountainFar: '#1d1733',
    mountainMid: '#281e42',
    duneFar: '#4a2e56',
    duneMid: '#683b63',
    duneFront: '#824874',
    sunColor: '#f0f3ff',
    hasWater: false,
    balloonChance: 0.45,
    ropeChance: 0.55
  }
];

export const TIME_PERIODS = [
  { name: 'Dawn', ambientFilter: 'rgba(255, 170, 120, 0.12)', starOpacity: 0.1, sunY: 0.75, isNight: false },
  { name: 'Day', ambientFilter: 'rgba(255, 255, 255, 0)', starOpacity: 0.0, sunY: 0.25, isNight: false },
  { name: 'Golden Hour', ambientFilter: 'rgba(255, 140, 60, 0.18)', starOpacity: 0.0, sunY: 0.65, isNight: false },
  { name: 'Sunset', ambientFilter: 'rgba(220, 80, 120, 0.22)', starOpacity: 0.3, sunY: 0.85, isNight: false },
  { name: 'Dusk', ambientFilter: 'rgba(80, 50, 120, 0.28)', starOpacity: 0.7, sunY: 0.95, isNight: true },
  { name: 'Midnight', ambientFilter: 'rgba(15, 10, 45, 0.35)', starOpacity: 1.0, sunY: 1.2, isNight: true }
];

export const TRICKS = {
  BACKFLIP: { name: 'Backflip', score: 100, boostBonus: 2.0 },
  DOUBLE_FLIP: { name: 'Double Backflip', score: 300, boostBonus: 4.0 },
  TRIPLE_FLIP: { name: 'Triple Backflip!', score: 800, boostBonus: 7.0 },
  GRIND: { name: 'Grind', scorePerSec: 150, boostBonus: 1.5 },
  BALLOON_BOUNCE: { name: 'Balloon Bounce', score: 200, boostBonus: 3.5 },
  ROCK_BOUNCE: { name: 'Rock Bounce', score: 250, boostBonus: 3.0 },
  ROCK_SMASH: { name: 'Rock Smash!', score: 400, boostBonus: 5.0 },
  CHASM_CROSS: { name: 'Chasm Leap', score: 350, boostBonus: 3.0 },
  CLOSE_SHAVE: { name: 'Close Shave', score: 150, boostBonus: 2.0 },
  GREAT_LANDING: { name: 'Great Landing!', score: 100, boostBonus: 2.5 },
  PERFECT_LANDING: { name: 'Perfect Landing!', score: 250, boostBonus: 5.0 }
};

export const INITIAL_GOALS = [
  { id: 'first_flip', text: 'Land your first backflip', target: 1, current: 0, completed: false, type: 'flip' },
  { id: 'travel_500', text: 'Travel 500 meters in a single run', target: 500, current: 0, completed: false, type: 'distance' },
  { id: 'coins_25', text: 'Collect 25 coins', target: 25, current: 0, completed: false, type: 'coins' },
  { id: 'grind_rope', text: 'Grind on a ruin rope or wire', target: 1, current: 0, completed: false, type: 'grind' },
  { id: 'balloon_bounce', text: 'Bounce off a hot air balloon', target: 1, current: 0, completed: false, type: 'balloon' },
  { id: 'combo_1000', text: 'Score a 1,000+ point combo', target: 1000, current: 0, completed: false, type: 'combo' },
  { id: 'double_flip', text: 'Perform a double backflip', target: 1, current: 0, completed: false, type: 'double_flip' },
  { id: 'travel_2000', text: 'Travel 2,000 meters in a single run', target: 2000, current: 0, completed: false, type: 'distance' },
  { id: 'smash_rock', text: 'Smash through a rock with scarf boost', target: 1, current: 0, completed: false, type: 'rock_smash' }
];
