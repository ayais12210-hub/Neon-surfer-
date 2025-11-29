
import { create } from 'zustand';
import { GameState, PLAYER_SPEED_BASE, MAX_SPEED, CHARACTERS, SOUNDTRACKS, Challenge, ChallengeObjective, ChallengeType, UserProfile, LeaderboardEntry } from './types';

interface ExtendedGameState extends GameState {
  isMuted: boolean;
  toggleMute: () => void;
}

// --- PERSISTENCE HELPERS ---

const getStorage = (key: string, def: any) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : def;
  } catch { return def; }
};

const setStorage = (key: string, val: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

// --- CHALLENGE GENERATION ---

const generateChallenge = (type: ChallengeType): Challenge => {
  const isDaily = type === 'DAILY';
  const now = Date.now();
  // Expires in 24 hours or 7 days
  const expiresAt = now + (isDaily ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);
  
  const rand = Math.random();
  let objective: ChallengeObjective;
  let target = 0;
  let description = "";
  let reward = 0;

  if (rand < 0.3) {
    objective = 'COLLECT_COINS';
    target = isDaily ? 200 : 2000;
    description = `Collect ${target} Coins`;
    reward = isDaily ? 500 : 3000;
  } else if (rand < 0.6) {
    objective = 'SCORE_TOTAL';
    target = isDaily ? 50000 : 500000;
    description = `Score ${target / 1000}k Points`;
    reward = isDaily ? 600 : 4000;
  } else if (rand < 0.8) {
    objective = 'USE_POWERUPS';
    target = isDaily ? 10 : 50;
    description = `Use ${target} Powerups`;
    reward = isDaily ? 400 : 2500;
  } else {
    objective = 'RUN_DISTANCE';
    target = isDaily ? 5000 : 50000; // Arbitrary units based on score/speed
    description = `Run ${target}m Total`;
    reward = isDaily ? 500 : 3500;
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    objective,
    description,
    target,
    progress: 0,
    reward,
    isCompleted: false,
    isClaimed: false,
    expiresAt
  };
};

// --- LEADERBOARD HELPERS ---

const NAMES = ["CyberNinja", "NeonDrifter", "GlitchHunter", "VoidRunner", "PixelMaster", "ByteRacer", "SynthWave", "RetroKing", "LaserQueen", "NullPointer"];
const generateLeaderboardData = (count: number, scoreBase: number, userScore: number, userId: string, userName: string, userAvatar: string): LeaderboardEntry[] => {
    let entries: LeaderboardEntry[] = [];
    
    // Add rivals
    for (let i = 0; i < count; i++) {
        const score = Math.floor(scoreBase * (0.5 + Math.random()));
        entries.push({
            id: `rival_${i}`,
            rank: 0,
            name: NAMES[Math.floor(Math.random() * NAMES.length)] + "_" + Math.floor(Math.random() * 99),
            score,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.random()}&backgroundColor=b6e3f4`,
            isPlayer: false
        });
    }

    // Add Player
    entries.push({
        id: userId,
        rank: 0,
        name: userName,
        score: userScore,
        avatar: userAvatar,
        isPlayer: true
    });

    // Sort
    entries.sort((a, b) => b.score - a.score);

    // Rank
    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
};

export const useGameStore = create<ExtendedGameState>((set, get) => ({
  status: getStorage('neon-surfer-user', null) ? 'idle' : 'login',
  user: getStorage('neon-surfer-user', null),
  
  score: 0,
  highScore: getStorage('neon-surfer-highscore', 0),
  coins: 0, // Run coins
  bank: getStorage('neon-surfer-bank', 0), // Persistent wallet
  speed: PLAYER_SPEED_BASE,
  isMuted: false,
  gameId: 0,
  
  selectedCharacterId: getStorage('neon-surfer-char-id', CHARACTERS[0].id),
  unlockedCharacters: getStorage('neon-surfer-unlocked', [CHARACTERS[0].id]),
  
  selectedSoundtrackId: getStorage('neon-surfer-ost-id', SOUNDTRACKS[0].id),
  unlockedSoundtracks: getStorage('neon-surfer-unlocked-ost', [SOUNDTRACKS[0].id]),
  
  upgrades: getStorage('neon-surfer-upgrades', { multiplier: 1, speed: 1 }),
  
  activePowerups: {
    shield: false,
    multiplier: 0,
    speedBoost: 0
  },

  challenges: getStorage('neon-surfer-challenges', []),

  globalLeaderboard: [],
  friendsLeaderboard: [],
  referralCount: getStorage('neon-surfer-referrals', 0),

  // --- AUTH ACTIONS ---

  login: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock User Data
    const mockUser: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name: 'NeoRunner_' + Math.floor(Math.random() * 999),
      email: 'player@neontemple.com',
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.random()}&backgroundColor=b6e3f4`,
      referralCode: Math.random().toString(36).substr(2, 6).toUpperCase()
    };

    setStorage('neon-surfer-user', mockUser);
    set({ user: mockUser, status: 'idle' });
  },

  logout: () => {
    setStorage('neon-surfer-user', null);
    set({ user: null, status: 'login' });
  },

  // --- GAME ACTIONS ---

  startGame: () => {
    // Ensure challenges are up to date when starting
    get().initChallenges();
    set((state) => ({ 
      status: 'playing', 
      score: 0, 
      coins: 0, 
      speed: PLAYER_SPEED_BASE,
      activePowerups: { shield: false, multiplier: 0, speedBoost: 0 },
      gameId: state.gameId + 1 
    }));
  },
  
  endGame: () => {
    const state = get();
    const newHighScore = state.score > state.highScore ? state.score : state.highScore;
    const newBank = state.bank + state.coins;
    
    setStorage('neon-surfer-highscore', Math.floor(newHighScore));
    setStorage('neon-surfer-bank', newBank);
    
    // Report score and distance stats to challenges
    state.reportProgress('SCORE_TOTAL', Math.floor(state.score));
    state.reportProgress('RUN_DISTANCE', Math.floor(state.score)); // Score approximates distance

    return set({ 
      status: 'gameover',
      highScore: newHighScore,
      bank: newBank
    });
  },
  
  resetGame: () => set((state) => ({ 
    status: 'idle', 
    score: 0, 
    coins: 0, 
    speed: PLAYER_SPEED_BASE,
    activePowerups: { shield: false, multiplier: 0, speedBoost: 0 },
    gameId: state.gameId + 1 
  })),

  togglePause: () => set((state) => {
    if (state.status === 'playing') return { status: 'paused' };
    if (state.status === 'paused') return { status: 'playing' };
    return {};
  }),

  // --- STORE ACTIONS ---

  selectCharacter: (id: string) => {
    if (!get().unlockedCharacters.includes(id)) return;
    setStorage('neon-surfer-char-id', id);
    set({ selectedCharacterId: id });
  },

  buyCharacter: (id: string) => set((state) => {
    const char = CHARACTERS.find(c => c.id === id);
    if (!char) return {};
    if (state.unlockedCharacters.includes(id)) return {}; // Already owned
    if (state.bank < char.price) return {}; // Too poor

    const newBank = state.bank - char.price;
    const newUnlocked = [...state.unlockedCharacters, id];
    
    setStorage('neon-surfer-bank', newBank);
    setStorage('neon-surfer-unlocked', newUnlocked);
    setStorage('neon-surfer-char-id', id); // Auto equip

    return { 
      bank: newBank, 
      unlockedCharacters: newUnlocked,
      selectedCharacterId: id
    };
  }),

  selectSoundtrack: (id: string) => {
    if (!get().unlockedSoundtracks.includes(id)) return;
    setStorage('neon-surfer-ost-id', id);
    set({ selectedSoundtrackId: id });
  },

  buySoundtrack: (id: string) => set((state) => {
    const track = SOUNDTRACKS.find(t => t.id === id);
    if (!track) return {};
    if (state.unlockedSoundtracks.includes(id)) return {};
    if (state.bank < track.price) return {};

    const newBank = state.bank - track.price;
    const newUnlocked = [...state.unlockedSoundtracks, id];

    setStorage('neon-surfer-bank', newBank);
    setStorage('neon-surfer-unlocked-ost', newUnlocked);
    setStorage('neon-surfer-ost-id', id);

    return {
      bank: newBank,
      unlockedSoundtracks: newUnlocked,
      selectedSoundtrackId: id
    };
  }),

  buyUpgrade: (type: 'multiplier' | 'speed') => set((state) => {
    const currentLevel = state.upgrades[type];
    if (currentLevel >= 5) return {}; // Max level
    
    const cost = currentLevel * 1000; // Cost Scaling: 1000, 2000, 3000, 4000
    if (state.bank < cost) return {};

    const newBank = state.bank - cost;
    const newUpgrades = { ...state.upgrades, [type]: currentLevel + 1 };
    
    setStorage('neon-surfer-bank', newBank);
    setStorage('neon-surfer-upgrades', newUpgrades);

    return { bank: newBank, upgrades: newUpgrades };
  }),
  
  // --- GAMEPLAY ACTIONS ---

  addScore: (amount) => set((state) => ({ 
    score: state.score + amount * (state.activePowerups.multiplier > 0 ? 2 : 1) 
  })),
  
  addCoin: () => {
    get().reportProgress('COLLECT_COINS', 1);
    set((state) => ({ 
      coins: state.coins + 1, 
      score: state.score + 50 * (state.activePowerups.multiplier > 0 ? 2 : 1) 
    }));
  },
  
  increaseSpeed: () => set((state) => {
    const char = CHARACTERS.find(c => c.id === state.selectedCharacterId) || CHARACTERS[0];
    const maxSpeed = MAX_SPEED * char.stats.speed;
    return { speed: Math.min(state.speed + 0.005, maxSpeed) }
  }),
  
  setStatus: (status) => set({ status }),
  
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  // --- POWERUP LOGIC ---

  activateShield: () => {
    get().reportProgress('USE_POWERUPS', 1);
    set(state => ({
      activePowerups: { ...state.activePowerups, shield: true }
    }));
  },
  
  breakShield: () => set(state => ({
    activePowerups: { ...state.activePowerups, shield: false }
  })),
  
  activateMultiplier: () => {
    get().reportProgress('USE_POWERUPS', 1);
    set(state => {
      // Base 5s + 2s per level (Level 1 = 7s, Max = 15s)
      const duration = 5.0 + (state.upgrades.multiplier * 2.0);
      return { activePowerups: { ...state.activePowerups, multiplier: duration } };
    });
  },
  
  activateSpeedBoost: () => {
    get().reportProgress('USE_POWERUPS', 1);
    set(state => {
      // Base 3s + 1s per level (Level 1 = 4s, Max = 8s)
      const duration = 3.0 + (state.upgrades.speed * 1.0);
      return { activePowerups: { ...state.activePowerups, speedBoost: duration } };
    });
  },
  
  tickPowerups: (delta) => set(state => {
    const { multiplier, speedBoost } = state.activePowerups;
    if (multiplier <= 0 && speedBoost <= 0) return {};
    
    return {
      activePowerups: {
        ...state.activePowerups,
        multiplier: Math.max(0, multiplier - delta),
        speedBoost: Math.max(0, speedBoost - delta)
      }
    };
  }),

  // --- CHALLENGE SYSTEM ACTIONS ---

  initChallenges: () => set(state => {
    const now = Date.now();
    let current = [...state.challenges];
    let changed = false;

    // Filter out expired (that are claimed or not completed) 
    // Usually in games you keep them until user sees them, but for simplicity we rotate if expired.
    
    // Check Daily
    const daily = current.find(c => c.type === 'DAILY');
    if (!daily || now > daily.expiresAt) {
       current = current.filter(c => c.type !== 'DAILY'); // Remove old
       current.push(generateChallenge('DAILY'));
       changed = true;
    }

    // Check Weekly
    const weekly = current.find(c => c.type === 'WEEKLY');
    if (!weekly || now > weekly.expiresAt) {
       current = current.filter(c => c.type !== 'WEEKLY'); // Remove old
       current.push(generateChallenge('WEEKLY'));
       changed = true;
    }

    if (changed) {
        setStorage('neon-surfer-challenges', current);
        return { challenges: current };
    }
    return {};
  }),

  reportProgress: (type, amount) => set(state => {
    const updatedChallenges = state.challenges.map(c => {
       if (c.objective === type && !c.isCompleted) {
         const newProgress = Math.min(c.progress + amount, c.target);
         const isCompleted = newProgress >= c.target;
         return { ...c, progress: newProgress, isCompleted };
       }
       return c;
    });
    
    // Only update if something changed
    if (JSON.stringify(updatedChallenges) !== JSON.stringify(state.challenges)) {
        setStorage('neon-surfer-challenges', updatedChallenges);
        return { challenges: updatedChallenges };
    }
    return {};
  }),

  claimChallengeReward: (id) => set(state => {
     const challenge = state.challenges.find(c => c.id === id);
     if (!challenge || !challenge.isCompleted || challenge.isClaimed) return {};

     const newBank = state.bank + challenge.reward;
     const updatedChallenges = state.challenges.map(c => 
        c.id === id ? { ...c, isClaimed: true } : c
     );

     setStorage('neon-surfer-bank', newBank);
     setStorage('neon-surfer-challenges', updatedChallenges);

     return { bank: newBank, challenges: updatedChallenges };
  }),

  // --- LEADERBOARD ACTIONS ---
  fetchLeaderboard: () => set(state => {
      // Simulate fetching
      const user = state.user || { id: 'guest', name: 'You', avatar: '', email: '', referralCode: '' };
      
      const global = generateLeaderboardData(
          15, 
          state.highScore > 0 ? state.highScore * 1.5 : 100000, 
          state.highScore, 
          user.id, 
          user.name, 
          user.avatar
      );

      const friends = generateLeaderboardData(
          5, 
          state.highScore > 0 ? state.highScore * 1.2 : 50000, 
          state.highScore, 
          user.id, 
          user.name, 
          user.avatar
      );

      return { globalLeaderboard: global, friendsLeaderboard: friends };
  }),
  
  // --- REFERRAL ACTIONS ---
  checkReferral: () => {
    // Only check if we are in a browser environment
    if (typeof window === 'undefined') return null;
    
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    
    // In a real app, validate code against backend
    // Here we act as if any ref code is valid
    if (refCode) {
        const welcomeBonus = 1000;
        const currentBank = get().bank;
        
        // Ensure we don't claim twice (simple check)
        const hasClaimed = localStorage.getItem('neon-surfer-ref-claimed');
        if (!hasClaimed) {
             setStorage('neon-surfer-bank', currentBank + welcomeBonus);
             localStorage.setItem('neon-surfer-ref-claimed', 'true');
             set({ bank: currentBank + welcomeBonus });
             return refCode; // Return the code to show UI feedback
        }
    }
    return null;
  }
}));
