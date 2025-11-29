
export enum Lane {
  LEFT = -1,
  CENTER = 0,
  RIGHT = 1,
}

export const LANE_WIDTH = 3.0; // Wider lanes for better visibility
export const JUMP_HEIGHT = 3.2; // Higher jump for trains
export const JUMP_DURATION = 0.55;
export const SLIDE_DURATION = 0.7;
export const PLAYER_SPEED_BASE = 20;
export const MAX_SPEED = 50;

export enum ObstacleType {
  WALL = 'WALL',           // Static low wall (jump over)
  TALL_WALL = 'TALL_WALL', // Static tall wall (move around)
  ARCH = 'ARCH',           // High arch (slide under)
  TRAIN = 'TRAIN',         // Moving block (move around or jump if static)
  COIN = 'COIN',            // Collectible
  LASER_GRID = 'LASER_GRID', // Blinking wall (timing)
  FALLING_OBSTACLE = 'FALLING_OBSTACLE', // Drops from sky (reaction)
  POWERUP_SHIELD = 'POWERUP_SHIELD', // One-hit protection
  POWERUP_MULTIPLIER = 'POWERUP_MULTIPLIER', // 2x Score for duration
  POWERUP_SPEED = 'POWERUP_SPEED' // Invincibility + Boost
}

// --- USER SYSTEM ---

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  referralCode: string;
}

// --- CHARACTER SYSTEM ---

export interface CharacterStats {
  speed: number;   // Max speed multiplier
  handling: number; // Lane change speed/responsiveness
  jump: number;    // Jump height multiplier
}

export interface Character {
  id: string;
  name: string;
  description: string;
  stats: CharacterStats;
  price: number; // COST IN COINS
  colors: {
    primary: string;
    secondary: string;
    emissive: string;
  };
  modelType: 'racer' | 'tank' | 'stealth';
}

export const CHARACTERS: Character[] = [
  {
    id: 'spectre',
    name: 'SPECTRE',
    description: 'High-velocity stealth prototype. Exceptional handling but lighter weight.',
    modelType: 'stealth',
    price: 0,
    stats: { speed: 1.1, handling: 1.2, jump: 1.0 },
    colors: { primary: '#1a1a2e', secondary: '#0f3460', emissive: '#00ffff' }
  },
  {
    id: 'juggernaut',
    name: 'JUGGERNAUT',
    description: 'Heavy assault frame. Slower acceleration, but stable and powerful.',
    modelType: 'tank',
    price: 2500,
    stats: { speed: 0.9, handling: 0.8, jump: 0.9 },
    colors: { primary: '#2d1b1b', secondary: '#4a0e0e', emissive: '#ff3333' }
  },
  {
    id: 'valkyrie',
    name: 'VALKYRIE',
    description: 'Aerodynamic racer. Balanced performance with enhanced vertical thrusters.',
    modelType: 'racer',
    price: 5000,
    stats: { speed: 1.0, handling: 1.0, jump: 1.15 },
    colors: { primary: '#eee', secondary: '#cbd5e1', emissive: '#ff00ff' }
  }
];

// --- SOUNDTRACK SYSTEM ---

export interface Soundtrack {
  id: string;
  name: string;
  description: string;
  price: number;
  bpm: number;
}

export const SOUNDTRACKS: Soundtrack[] = [
  { 
    id: 'neon_drift', 
    name: 'NEON DRIFT', 
    description: 'The classic pulse of the grid. Balanced tempo.', 
    price: 0, 
    bpm: 128 
  },
  { 
    id: 'cyber_chase', 
    name: 'CYBER CHASE', 
    description: 'High-octane industrial beats for aggressive runners.', 
    price: 2000, 
    bpm: 145 
  },
  { 
    id: 'void_echoes', 
    name: 'VOID ECHOES', 
    description: 'Deep, atmospheric resonance. Slower, heavier rhythm.', 
    price: 3500, 
    bpm: 100 
  }
];

export interface UpgradeState {
  multiplier: number; // Level 1-5
  speed: number;      // Level 1-5
}

// --- CHALLENGE SYSTEM ---

export type ChallengeType = 'DAILY' | 'WEEKLY';
export type ChallengeObjective = 'COLLECT_COINS' | 'SCORE_TOTAL' | 'USE_POWERUPS' | 'RUN_DISTANCE';

export interface Challenge {
  id: string;
  type: ChallengeType;
  objective: ChallengeObjective;
  description: string;
  target: number;
  progress: number;
  reward: number; // Bank Coins
  isCompleted: boolean;
  isClaimed: boolean;
  expiresAt: number; // Timestamp
}

// --- LEADERBOARD SYSTEM ---

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  score: number;
  avatar: string;
  isPlayer: boolean;
}

export interface GameState {
  status: 'login' | 'idle' | 'playing' | 'gameover' | 'paused' | 'garage' | 'store' | 'challenges' | 'leaderboard';
  user: UserProfile | null;
  score: number;
  highScore: number;
  coins: number; // Current run coins
  bank: number;  // Total saved coins
  speed: number;
  gameId: number; 
  
  selectedCharacterId: string;
  unlockedCharacters: string[];
  
  selectedSoundtrackId: string;
  unlockedSoundtracks: string[];

  upgrades: UpgradeState;
  
  // Powerup State
  activePowerups: {
    shield: boolean;
    multiplier: number; 
    speedBoost: number; 
  };

  // Challenge State
  challenges: Challenge[];

  // Leaderboard State
  globalLeaderboard: LeaderboardEntry[];
  friendsLeaderboard: LeaderboardEntry[];
  
  // Referral State
  referralCount: number;

  login: () => Promise<void>;
  logout: () => void;
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  togglePause: () => void;
  addScore: (amount: number) => void;
  addCoin: () => void;
  increaseSpeed: () => void;
  setStatus: (status: 'login' | 'idle' | 'playing' | 'gameover' | 'paused' | 'garage' | 'store' | 'challenges' | 'leaderboard') => void;
  
  selectCharacter: (id: string) => void;
  buyCharacter: (id: string) => void;
  
  selectSoundtrack: (id: string) => void;
  buySoundtrack: (id: string) => void;

  buyUpgrade: (type: 'multiplier' | 'speed') => void;
  
  // Powerup Actions
  activateShield: () => void;
  breakShield: () => void;
  activateMultiplier: () => void;
  activateSpeedBoost: () => void;
  tickPowerups: (delta: number) => void;

  // Challenge Actions
  initChallenges: () => void;
  claimChallengeReward: (id: string) => void;
  reportProgress: (type: ChallengeObjective, amount: number) => void;

  // Leaderboard Actions
  fetchLeaderboard: () => void;
  
  // Referral Actions
  checkReferral: () => string | null; // Returns referrer name if valid
}
