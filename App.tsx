import React, { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { useGameStore } from './store';
import { 
  Play, RotateCcw, Trophy, Zap, Coins, Volume2, VolumeX, Shield, 
  Disc, FastForward, Share2, Menu as MenuIcon, Pause, User, ChevronRight, ChevronLeft, BarChart3, ShoppingCart, Lock, ArrowUpCircle, X, CheckCircle, Calendar, Clock, Music, LogOut, Award, Users, Globe, Copy, Gift
} from 'lucide-react';
import clsx from 'clsx';
import { audioManager } from './audio';
import { Joystick } from './components/Joystick';
import { CHARACTERS, SOUNDTRACKS, Challenge } from './types';
import { LoginPage } from './components/LoginPage';

// Helper Component for Challenges
interface ChallengeCardProps {
  challenge: Challenge;
  onClaim: () => void;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onClaim }) => {
  const percent = Math.min(100, (challenge.progress / challenge.target) * 100);
  
  return (
      <div className={clsx(
          "relative p-4 rounded-xl border-2 flex items-center justify-between transition-all group overflow-hidden",
          challenge.isCompleted ? (challenge.isClaimed ? "border-green-900/30 bg-green-900/10 opacity-60" : "border-green-500 bg-green-900/20") : "border-white/10 bg-white/5"
      )}>
          {/* Progress Bar Background */}
          <div className="absolute inset-0 bg-gray-800/50 z-0 pointer-events-none">
               <div className="h-full bg-white/5 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
          </div>

          <div className="relative z-10 flex items-center gap-4">
              <div className={clsx(
                  "w-12 h-12 rounded-lg flex items-center justify-center border flex-shrink-0",
                  challenge.isCompleted ? "bg-green-500 border-green-400 text-black" : "bg-black/50 border-white/20 text-gray-400"
              )}>
                  {challenge.objective === 'COLLECT_COINS' && <Coins className="w-6 h-6" />}
                  {challenge.objective === 'SCORE_TOTAL' && <Trophy className="w-6 h-6" />}
                  {challenge.objective === 'USE_POWERUPS' && <Zap className="w-6 h-6" />}
                  {challenge.objective === 'RUN_DISTANCE' && <FastForward className="w-6 h-6" />}
              </div>
              <div>
                  <h4 className="font-bold text-lg text-white leading-tight">{challenge.description}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono mt-1">
                      <span className={clsx("font-bold", challenge.isCompleted ? "text-green-400" : "text-cyan-400")}>
                          {Math.floor(challenge.progress).toLocaleString()} / {Math.floor(challenge.target).toLocaleString()}
                      </span>
                      <span className="text-gray-500">•</span>
                      <span className="text-yellow-500 font-bold flex items-center gap-1">
                           <Coins className="w-3 h-3" /> {challenge.reward}
                      </span>
                  </div>
              </div>
          </div>

          <div className="relative z-10 ml-4">
              {challenge.isCompleted ? (
                  challenge.isClaimed ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 text-green-500 font-bold rounded-lg text-sm uppercase tracking-wider border border-green-500/20 whitespace-nowrap">
                          <CheckCircle className="w-4 h-4" /> Claimed
                      </div>
                  ) : (
                      <button 
                          onClick={onClaim}
                          className="bg-green-500 hover:bg-green-400 text-black font-black px-6 py-2 rounded-lg text-sm uppercase tracking-wider flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)] whitespace-nowrap"
                      >
                          Claim
                      </button>
                  )
              ) : (
                  <div className="px-4 py-2 bg-black/40 text-gray-500 font-bold rounded-lg text-sm uppercase tracking-wider border border-white/5 whitespace-nowrap">
                      In Progress
                  </div>
              )}
          </div>
      </div>
  )
}

function App() {
  const { 
    status, score, highScore, coins, bank, speed, isMuted, activePowerups, 
    selectedCharacterId, unlockedCharacters, upgrades, challenges,
    selectedSoundtrackId, unlockedSoundtracks, user,
    globalLeaderboard, friendsLeaderboard, referralCount,
    startGame, resetGame, toggleMute, togglePause, setStatus, 
    selectCharacter, buyCharacter, buyUpgrade, initChallenges, claimChallengeReward,
    selectSoundtrack, buySoundtrack, logout, fetchLeaderboard, checkReferral
  } = useGameStore();

  const [showShareToast, setShowShareToast] = useState(false);
  const [showReferralToast, setShowReferralToast] = useState(false);
  const [welcomeBonusFrom, setWelcomeBonusFrom] = useState<string | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'GLOBAL' | 'FRIENDS'>('GLOBAL');

  // BGM Logic
  useEffect(() => {
    // Update theme whenever selected ID changes
    audioManager.setTheme(selectedSoundtrackId);
    
    if (status === 'playing') {
      audioManager.startBgm();
    } else {
      audioManager.stopBgm();
    }
  }, [status, selectedSoundtrackId]);

  useEffect(() => {
    audioManager.toggleMute(isMuted);
  }, [isMuted]);

  // Init challenges on load and check referral
  useEffect(() => {
    initChallenges();
    const referrer = checkReferral();
    if (referrer) {
        setWelcomeBonusFrom(referrer);
        setTimeout(() => setWelcomeBonusFrom(null), 5000);
    }
  }, []);

  // Fetch leaderboard when entering status
  useEffect(() => {
    if (status === 'leaderboard') {
        fetchLeaderboard();
    }
  }, [status]);

  // Handle Android Hardware Back Button & Keyboard Escape
  useEffect(() => {
    const handleBackAction = () => {
        if (status === 'playing') {
            togglePause();
            return true;
        } else if (status === 'paused' || status === 'garage' || status === 'store' || status === 'challenges' || status === 'leaderboard') {
            setStatus('idle');
            return true;
        } else if (status === 'gameover') {
             resetGame();
             return true;
        }
        return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleBackAction();
      }
    };

    // Push a dummy state to history to capture the back button on mobile web/hybrid
    if (status !== 'idle' && status !== 'login') {
        window.history.pushState(null, '', window.location.pathname);
    }

    const handlePopState = (event: PopStateEvent) => {
        // Prevent default back behavior and run our logic
        const handled = handleBackAction();
        if (handled) {
            // Push state again so we can catch the next back button press
            window.history.pushState(null, '', window.location.pathname);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('popstate', handlePopState);
    };
  }, [togglePause, status, setStatus, resetGame]);

  const handleStart = () => {
    audioManager.init();
    startGame();
  };

  const handleReset = () => {
     audioManager.init();
     resetGame();
  }

  const handleShare = async () => {
    const shareData = {
      title: 'Neon Temple Surfer',
      text: `I just scored ${Math.floor(score)} in Neon Temple Surfer! Can you beat my high score of ${Math.floor(highScore)}?`,
      url: window.location.href // In a real app, this would be your Play Store URL
    };
    try {
      // Prioritize native sharing (works on Mobile Web and Native Wrappers)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  const handleCopyReferral = async () => {
      if (!user) return;
      const url = `${window.location.origin}${window.location.pathname}?ref=${user.referralCode}`;
      const text = `Join me in Neon Temple Surfer! Use my code to get a 1000 Coin starter bonus. ${url}`;
      
      try {
          await navigator.clipboard.writeText(text);
          setShowReferralToast(true);
          setTimeout(() => setShowReferralToast(false), 2000);
      } catch (err) {
          console.error("Copy failed", err);
      }
  }

  // Character Selection Logic
  const currentCharacterIndex = CHARACTERS.findIndex(c => c.id === selectedCharacterId);
  const cycleCharacter = (direction: 'next' | 'prev') => {
      let newIndex = direction === 'next' ? currentCharacterIndex + 1 : currentCharacterIndex - 1;
      if (newIndex >= CHARACTERS.length) newIndex = 0;
      if (newIndex < 0) newIndex = CHARACTERS.length - 1;
      selectCharacter(CHARACTERS[newIndex].id);
  }

  const hasUnclaimedChallenges = challenges.some(c => c.isCompleted && !c.isClaimed);

  // --- RENDER ---

  if (status === 'login') {
      return (
          <div className="relative w-full h-full bg-black">
              <div className="absolute inset-0 z-0">
                  <GameCanvas />
              </div>
              <LoginPage />
          </div>
      )
  }

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden font-sans select-none">
      {/* 3D Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas />
      </div>

      {/* Share Toast Notification */}
      <div className={clsx(
          "absolute top-24 left-1/2 transform -translate-x-1/2 z-50 bg-white text-black px-6 py-3 rounded-full font-black shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all duration-300 pointer-events-none flex items-center gap-2",
          showShareToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}>
          <CheckCircle className="w-5 h-5 text-green-500" />
          SCORE COPIED TO CLIPBOARD
      </div>
      
      {/* Referral Copy Toast */}
      <div className={clsx(
          "absolute top-24 left-1/2 transform -translate-x-1/2 z-50 bg-cyan-400 text-black px-6 py-3 rounded-full font-black shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 pointer-events-none flex items-center gap-2",
          showReferralToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}>
          <Copy className="w-5 h-5 text-black" />
          REFERRAL LINK COPIED
      </div>

      {/* Welcome Bonus Toast */}
      <div className={clsx(
          "absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-8 py-4 rounded-xl font-black shadow-[0_0_30px_rgba(234,179,8,0.8)] transition-all duration-500 pointer-events-none flex flex-col items-center gap-1",
          welcomeBonusFrom ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-90"
      )}>
          <div className="flex items-center gap-2 text-lg">
              <Gift className="w-6 h-6 animate-bounce" />
              WELCOME BONUS!
          </div>
          <div className="text-sm font-bold opacity-80">Referral accepted from {welcomeBonusFrom}</div>
          <div className="bg-black/20 px-3 py-1 rounded text-white font-mono mt-1">+1000 COINS</div>
      </div>


      {/* HUD Layer */}
      <div className={clsx("absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between transition-opacity duration-300", 
        (status === 'garage' || status === 'store' || status === 'challenges' || status === 'leaderboard') ? "opacity-0" : "opacity-100"
      )}>
        
        {/* Top Bar */}
        <div className="flex justify-between items-start pointer-events-auto mt-[env(safe-area-inset-top)]">
           <div className="flex flex-col gap-2 pointer-events-none">
              <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10">
                 <Trophy className="w-6 h-6 text-yellow-400" />
                 <div>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Score</p>
                   <p className="text-2xl font-black font-mono leading-none">{Math.floor(score).toString().padStart(6, '0')}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10">
                 <Coins className="w-6 h-6 text-yellow-400" />
                 <div>
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                     {status === 'playing' ? 'Run Coins' : 'Bank'}
                   </p>
                   <p className="text-xl font-black font-mono leading-none text-yellow-300">
                      {status === 'playing' ? coins : bank}
                   </p>
                 </div>
              </div>
           </div>

           <div className="flex items-start gap-4">
               {/* User Profile (Only visible if not playing for clarity, or always) */}
               {user && status !== 'playing' && (
                   <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md pl-4 pr-2 py-2 rounded-full border border-white/10">
                       <div className="text-right hidden md:block">
                           <p className="text-xs text-gray-400 font-bold uppercase">Welcome</p>
                           <p className="text-sm font-bold text-cyan-400 truncate max-w-[100px]">{user.name}</p>
                       </div>
                       <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500">
                           <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                       </div>
                   </div>
               )}

               <div className="flex flex-col items-end gap-2">
                 <div className="flex gap-2">
                   {(status === 'playing' || status === 'paused') && (
                     <button 
                        onClick={togglePause}
                        className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors pointer-events-auto"
                     >
                        {status === 'paused' ? <Play className="w-5 h-5 text-green-400" /> : <Pause className="w-5 h-5 text-white" />}
                     </button>
                   )}
                   <button 
                      onClick={toggleMute}
                      className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10 hover:bg-white/10 transition-colors pointer-events-auto"
                   >
                      {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
                   </button>
                 </div>
                 
                 {status === 'playing' && (
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-none">
                        <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <span className="font-mono font-bold text-cyan-400">{(speed * 10).toFixed(0)} KM/H</span>
                    </div>
                 )}
               </div>
           </div>
        </div>

        {/* ACTIVE POWERUPS HUD */}
        <div className="flex flex-col gap-2 items-center pointer-events-none">
             {activePowerups.shield && (
                 <div className="flex items-center gap-2 bg-cyan-900/80 backdrop-blur border border-cyan-400 px-4 py-2 rounded-lg animate-pulse">
                     <Shield className="w-6 h-6 text-cyan-200" />
                     <span className="font-bold text-cyan-200">SHIELD ACTIVE</span>
                 </div>
             )}
             {activePowerups.multiplier > 0 && (
                 <div className="flex items-center gap-2 bg-yellow-900/80 backdrop-blur border border-yellow-400 px-4 py-2 rounded-lg">
                     <Disc className="w-6 h-6 text-yellow-200" />
                     <span className="font-bold text-yellow-200">2X SCORE ({activePowerups.multiplier.toFixed(1)}s)</span>
                 </div>
             )}
             {activePowerups.speedBoost > 0 && (
                 <div className="flex items-center gap-2 bg-fuchsia-900/80 backdrop-blur border border-fuchsia-400 px-4 py-2 rounded-lg">
                     <FastForward className="w-6 h-6 text-fuchsia-200" />
                     <span className="font-bold text-fuchsia-200">HYPER SPEED ({activePowerups.speedBoost.toFixed(1)}s)</span>
                 </div>
             )}
        </div>

        {/* Bottom Controls Area */}
        <div className="flex justify-between items-end w-full mb-[env(safe-area-inset-bottom)]">
           <div className="pointer-events-auto">
             {status === 'playing' && <Joystick />}
           </div>
        </div>
      </div>

      {/* --- LIVE STORE SCREEN --- */}
      {status === 'store' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-xl flex flex-col pointer-events-auto pt-[env(safe-area-inset-top)]">
           {/* Store Header */}
           <div className="p-8 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-4">
                  <button onClick={() => setStatus('idle')} className="p-2 hover:bg-white/10 rounded-full">
                      <ChevronLeft className="w-8 h-8 text-white" />
                  </button>
                  <h2 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                      LIVE MARKET
                  </h2>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse">LIVE</span>
              </div>
              <div className="flex items-center gap-2 bg-black/50 px-6 py-3 rounded-full border border-yellow-500/30">
                  <Coins className="w-6 h-6 text-yellow-400" />
                  <span className="text-2xl font-mono font-bold text-yellow-400">{bank}</span>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-[env(safe-area-inset-bottom)]">
               
               {/* CHARACTERS SECTION */}
               <div className="space-y-6">
                   <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <User className="w-5 h-5" /> Runners
                   </h3>
                   <div className="grid gap-4">
                       {CHARACTERS.map(char => {
                           const isOwned = unlockedCharacters.includes(char.id);
                           const isSelected = selectedCharacterId === char.id;
                           
                           return (
                               <div key={char.id} className={clsx(
                                   "relative p-4 rounded-xl border-2 flex items-center justify-between transition-all group",
                                   isSelected ? "border-cyan-500 bg-cyan-900/20" : "border-white/10 bg-white/5 hover:border-white/30"
                               )}>
                                   <div className="flex items-center gap-4">
                                       <div className={clsx("w-16 h-16 rounded-lg flex items-center justify-center", isOwned ? "bg-gradient-to-br from-gray-700 to-black" : "bg-black opacity-50")}>
                                           <User className="w-8 h-8 text-gray-400" />
                                       </div>
                                       <div>
                                           <h4 className="font-black text-lg">{char.name}</h4>
                                           <p className="text-xs text-gray-400 max-w-[200px]">{char.description}</p>
                                       </div>
                                   </div>

                                   {isOwned ? (
                                       <button 
                                          onClick={() => selectCharacter(char.id)}
                                          disabled={isSelected}
                                          className={clsx(
                                              "px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider",
                                              isSelected ? "bg-cyan-500 text-black cursor-default" : "bg-white/10 hover:bg-white hover:text-black"
                                          )}
                                       >
                                           {isSelected ? "EQUIPPED" : "EQUIP"}
                                       </button>
                                   ) : (
                                       <button 
                                          onClick={() => buyCharacter(char.id)}
                                          className={clsx(
                                              "flex flex-col items-center px-6 py-2 rounded-lg font-bold transition-all",
                                              bank >= char.price ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                          )}
                                       >
                                           <span className="text-xs">BUY</span>
                                           <div className="flex items-center gap-1">
                                               <Coins className="w-3 h-3" />
                                               {char.price}
                                           </div>
                                       </button>
                                   )}
                               </div>
                           )
                       })}
                   </div>
               </div>

               {/* UPGRADES & AUDIO COLUMN */}
               <div className="flex flex-col gap-8">
                   
                   {/* SOUNDTRACKS SECTION */}
                   <div className="space-y-6">
                       <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <Music className="w-5 h-5" /> Audio Logs
                       </h3>
                       <div className="grid gap-3">
                           {SOUNDTRACKS.map(track => {
                               const isOwned = unlockedSoundtracks.includes(track.id);
                               const isSelected = selectedSoundtrackId === track.id;

                               return (
                                   <div key={track.id} className={clsx(
                                       "flex items-center justify-between p-4 rounded-xl border transition-all",
                                       isSelected ? "bg-purple-900/20 border-purple-500" : "bg-white/5 border-white/10"
                                   )}>
                                       <div className="flex items-center gap-4">
                                           <div className={clsx("p-2 rounded-full", isSelected ? "bg-purple-500 text-white" : "bg-gray-800 text-gray-500")}>
                                               <Music className="w-5 h-5" />
                                           </div>
                                           <div>
                                               <h4 className="font-bold">{track.name}</h4>
                                               <div className="flex items-center gap-2 text-xs text-gray-400">
                                                   <span className="bg-white/10 px-1.5 rounded">{track.bpm} BPM</span>
                                                   <span>{track.description}</span>
                                               </div>
                                           </div>
                                       </div>

                                       {isOwned ? (
                                           <button 
                                               onClick={() => selectSoundtrack(track.id)}
                                               disabled={isSelected}
                                               className={clsx(
                                                   "px-4 py-1.5 rounded text-xs font-bold uppercase",
                                                   isSelected ? "bg-purple-500 text-white" : "bg-white/10 hover:bg-white hover:text-black"
                                               )}
                                           >
                                               {isSelected ? "PLAYING" : "PLAY"}
                                           </button>
                                       ) : (
                                           <button 
                                               onClick={() => buySoundtrack(track.id)}
                                               className={clsx(
                                                   "flex items-center gap-1 px-4 py-1.5 rounded text-xs font-bold transition-all",
                                                   bank >= track.price ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-gray-800 text-gray-500"
                                               )}
                                           >
                                               <span>BUY</span>
                                               <Coins className="w-3 h-3" />
                                               {track.price}
                                           </button>
                                       )}
                                   </div>
                               )
                           })}
                       </div>
                   </div>

                   {/* UPGRADES SECTION */}
                   <div className="space-y-6">
                       <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                           <ArrowUpCircle className="w-5 h-5" /> Tech Upgrades
                       </h3>
                       
                       {/* Multiplier Upgrade */}
                       <div className="bg-black/40 border border-white/10 p-6 rounded-xl">
                           <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-3">
                                   <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-500/30">
                                       <Disc className="w-6 h-6 text-yellow-400" />
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-lg">Score Matrix</h4>
                                       <p className="text-sm text-gray-400">Increases 2x Multiplier duration</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <div className="text-xs text-gray-500 uppercase font-bold">Current Level</div>
                                   <div className="text-2xl font-mono text-yellow-400">{upgrades.multiplier} <span className="text-sm text-gray-600">/ 5</span></div>
                               </div>
                           </div>
                           
                           <div className="flex gap-1 h-2 mb-6">
                               {[1,2,3,4,5].map(lvl => (
                                   <div key={lvl} className={clsx("flex-1 rounded-full", lvl <= upgrades.multiplier ? "bg-yellow-500" : "bg-gray-800")} />
                               ))}
                           </div>

                           {upgrades.multiplier < 5 ? (
                                <button 
                                    onClick={() => buyUpgrade('multiplier')}
                                    className={clsx(
                                        "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all",
                                        bank >= upgrades.multiplier * 1000 ? "bg-yellow-500 hover:bg-yellow-400 text-black" : "bg-gray-800 text-gray-500"
                                    )}
                                >
                                    <span>UPGRADE TO LEVEL {upgrades.multiplier + 1}</span>
                                    <span className="bg-black/20 px-2 py-0.5 rounded flex items-center gap-1 text-sm">
                                        <Coins className="w-3 h-3" /> {upgrades.multiplier * 1000}
                                    </span>
                                </button>
                           ) : (
                               <div className="w-full py-3 bg-gray-800 text-yellow-500 font-bold text-center rounded-lg border border-yellow-500/30">MAX LEVEL REACHED</div>
                           )}
                       </div>

                       {/* Speed Upgrade */}
                       <div className="bg-black/40 border border-white/10 p-6 rounded-xl">
                           <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-3">
                                   <div className="p-3 bg-fuchsia-900/30 rounded-lg border border-fuchsia-500/30">
                                       <FastForward className="w-6 h-6 text-fuchsia-400" />
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-lg">Flux Engine</h4>
                                       <p className="text-sm text-gray-400">Increases Speed Boost duration</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <div className="text-xs text-gray-500 uppercase font-bold">Current Level</div>
                                   <div className="text-2xl font-mono text-fuchsia-400">{upgrades.speed} <span className="text-sm text-gray-600">/ 5</span></div>
                               </div>
                           </div>
                           
                           <div className="flex gap-1 h-2 mb-6">
                               {[1,2,3,4,5].map(lvl => (
                                   <div key={lvl} className={clsx("flex-1 rounded-full", lvl <= upgrades.speed ? "bg-fuchsia-500" : "bg-gray-800")} />
                               ))}
                           </div>

                           {upgrades.speed < 5 ? (
                                <button 
                                    onClick={() => buyUpgrade('speed')}
                                    className={clsx(
                                        "w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all",
                                        bank >= upgrades.speed * 1000 ? "bg-fuchsia-500 hover:bg-fuchsia-400 text-black" : "bg-gray-800 text-gray-500"
                                    )}
                                >
                                    <span>UPGRADE TO LEVEL {upgrades.speed + 1}</span>
                                    <span className="bg-black/20 px-2 py-0.5 rounded flex items-center gap-1 text-sm">
                                        <Coins className="w-3 h-3" /> {upgrades.speed * 1000}
                                    </span>
                                </button>
                           ) : (
                               <div className="w-full py-3 bg-gray-800 text-fuchsia-500 font-bold text-center rounded-lg border border-fuchsia-500/30">MAX LEVEL REACHED</div>
                           )}
                       </div>
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* --- CHALLENGES SCREEN --- */}
      {status === 'challenges' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-auto p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="w-full max-w-4xl bg-black/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
                
                {/* Header */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-cyan-900/20 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/20 rounded-xl">
                          <CheckCircle className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black italic text-white tracking-wide">QUEST LOG</h2>
                          <p className="text-gray-400 text-sm">Complete objectives to earn rewards</p>
                        </div>
                    </div>
                    <button onClick={() => setStatus('idle')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    
                    {/* DAILY */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-black text-gray-200 mb-4 uppercase tracking-widest">
                            <Clock className="w-5 h-5 text-yellow-400" /> Daily Challenges
                        </h3>
                        <div className="grid gap-4">
                            {challenges.filter(c => c.type === 'DAILY').map(challenge => (
                                <ChallengeCard key={challenge.id} challenge={challenge} onClaim={() => claimChallengeReward(challenge.id)} />
                            ))}
                            {challenges.filter(c => c.type === 'DAILY').length === 0 && (
                                <div className="text-gray-500 italic p-4 border border-dashed border-gray-800 rounded-xl">No active daily challenges. Check back later.</div>
                            )}
                        </div>
                    </div>

                    {/* WEEKLY */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xl font-black text-gray-200 mb-4 uppercase tracking-widest">
                            <Calendar className="w-5 h-5 text-purple-400" /> Weekly Challenges
                        </h3>
                        <div className="grid gap-4">
                             {challenges.filter(c => c.type === 'WEEKLY').map(challenge => (
                                <ChallengeCard key={challenge.id} challenge={challenge} onClaim={() => claimChallengeReward(challenge.id)} />
                            ))}
                             {challenges.filter(c => c.type === 'WEEKLY').length === 0 && (
                                <div className="text-gray-500 italic p-4 border border-dashed border-gray-800 rounded-xl">No active weekly challenges.</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
      )}

      {/* --- LEADERBOARD SCREEN --- */}
      {status === 'leaderboard' && (
          <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-auto p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
             <div className="w-full max-w-3xl bg-black/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
                {/* Header */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                          <Award className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black italic text-white tracking-wide">LEADERBOARDS</h2>
                          <p className="text-gray-400 text-sm">Top runners in the grid</p>
                        </div>
                    </div>
                    <button onClick={() => setStatus('idle')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400 hover:text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button 
                        onClick={() => setLeaderboardTab('GLOBAL')}
                        className={clsx(
                            "flex-1 py-4 font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors",
                            leaderboardTab === 'GLOBAL' ? "bg-white/5 text-purple-400 border-b-2 border-purple-400" : "text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Globe className="w-4 h-4" /> Global
                    </button>
                    <button 
                        onClick={() => setLeaderboardTab('FRIENDS')}
                        className={clsx(
                            "flex-1 py-4 font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors",
                            leaderboardTab === 'FRIENDS' ? "bg-white/5 text-cyan-400 border-b-2 border-cyan-400" : "text-gray-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Users className="w-4 h-4" /> Friends
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0">
                    {/* REFERRAL PROMO INSIDE FRIENDS TAB */}
                    {leaderboardTab === 'FRIENDS' && (
                        <div className="p-6 bg-cyan-900/10 border-b border-cyan-500/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg text-cyan-400 flex items-center gap-2">
                                        <Gift className="w-5 h-5" /> INVITE & EARN
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">Share your link. Get 500 Coins per friend.</p>
                                    <div className="flex items-center gap-2 mt-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 w-fit">
                                        <span className="text-xs text-gray-500 uppercase font-bold">Your Code:</span>
                                        <span className="font-mono text-white font-bold tracking-widest">{user?.referralCode || '----'}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                    <button 
                                        onClick={handleCopyReferral}
                                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                    >
                                        <Copy className="w-4 h-4" /> COPY LINK
                                    </button>
                                    <div className="text-xs text-gray-500">
                                        Friends Invited: <span className="text-cyan-400 font-bold">{referralCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-white/5">
                        {(leaderboardTab === 'GLOBAL' ? globalLeaderboard : friendsLeaderboard).map((entry, idx) => (
                            <div key={entry.id} className={clsx(
                                "flex items-center justify-between p-4 px-6 transition-colors",
                                entry.isPlayer ? "bg-white/10" : "hover:bg-white/5"
                            )}>
                                <div className="flex items-center gap-6">
                                    <div className={clsx(
                                        "w-8 font-black text-xl text-center",
                                        entry.rank === 1 ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" :
                                        entry.rank === 2 ? "text-gray-300" :
                                        entry.rank === 3 ? "text-amber-700" :
                                        "text-gray-600"
                                    )}>
                                        {entry.rank}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full overflow-hidden border-2",
                                            entry.isPlayer ? "border-cyan-400" : "border-gray-700"
                                        )}>
                                            <img src={entry.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className={clsx("font-bold text-lg", entry.isPlayer && "text-cyan-400")}>
                                                {entry.name} {entry.isPlayer && "(YOU)"}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">Rank {entry.rank}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-xl text-white">{entry.score.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500 uppercase font-bold">Score</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer showing player stats if not in top view (Optional, but good UX) */}
                <div className="bg-black/80 border-t border-white/10 p-4 flex justify-between items-center text-sm text-gray-400">
                     <div>
                        Your High Score: <span className="text-white font-mono font-bold">{Math.floor(highScore).toLocaleString()}</span>
                     </div>
                     <div className="text-xs uppercase font-bold tracking-widest opacity-50">
                        Updates in Real-time
                     </div>
                </div>
             </div>
          </div>
      )}

      {/* --- GARAGE SCREEN (Simplified now that we have Store) --- */}
      {status === 'garage' && (
          <div className="absolute inset-0 z-30 bg-gradient-to-t from-black via-black/50 to-transparent flex items-end justify-center pb-12 pointer-events-auto">
              
              <div className="absolute top-8 left-8 mt-[env(safe-area-inset-top)] ml-[env(safe-area-inset-left)]">
                  <button 
                    onClick={() => setStatus('idle')}
                    className="flex items-center gap-2 text-white/70 hover:text-white uppercase font-bold tracking-widest text-sm"
                  >
                      <ChevronLeft className="w-5 h-5" /> Back to Menu
                  </button>
              </div>

              <div className="w-full max-w-4xl px-8 flex flex-col md:flex-row items-end md:items-center justify-between gap-12 pb-[env(safe-area-inset-bottom)]">
                  <div className="flex-1 space-y-4 text-shadow-glow">
                      <div className="flex items-center gap-4">
                        <button onClick={() => cycleCharacter('prev')} className="p-2 hover:bg-white/10 rounded-full">
                            <ChevronLeft className="w-8 h-8 text-cyan-400" />
                        </button>
                        <div>
                             <h2 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                {CHARACTERS[currentCharacterIndex].name}
                             </h2>
                             <div className="h-1 w-24 bg-cyan-500 mt-2 shadow-[0_0_10px_#06b6d4]"></div>
                        </div>
                        <button onClick={() => cycleCharacter('next')} className="p-2 hover:bg-white/10 rounded-full">
                            <ChevronRight className="w-8 h-8 text-cyan-400" />
                        </button>
                      </div>
                      <p className="text-gray-300 max-w-md text-lg leading-relaxed border-l-2 border-white/20 pl-4">
                          {CHARACTERS[currentCharacterIndex].description}
                      </p>
                      {!unlockedCharacters.includes(CHARACTERS[currentCharacterIndex].id) && (
                          <div className="flex items-center gap-2 text-yellow-400 font-bold bg-black/50 px-4 py-2 rounded-lg inline-flex border border-yellow-500/30">
                              <Lock className="w-4 h-4" /> LOCKED - Available in Store
                          </div>
                      )}
                  </div>

                  <div className="w-full md:w-80 bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl">
                      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                          <BarChart3 className="w-5 h-5 text-cyan-400" />
                          <span className="font-bold tracking-wider">SPECS</span>
                      </div>
                      
                      <div className="space-y-6">
                          <div>
                              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">SPEED</span><span className="font-mono text-cyan-300">{(CHARACTERS[currentCharacterIndex].stats.speed * 100).toFixed(0)}%</span></div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]" style={{ width: `${CHARACTERS[currentCharacterIndex].stats.speed * 80}%` }}></div></div>
                          </div>
                          <div>
                              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">HANDLING</span><span className="font-mono text-fuchsia-300">{(CHARACTERS[currentCharacterIndex].stats.handling * 100).toFixed(0)}%</span></div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-fuchsia-500 shadow-[0_0_10px_#d946ef]" style={{ width: `${CHARACTERS[currentCharacterIndex].stats.handling * 80}%` }}></div></div>
                          </div>
                      </div>

                      <button 
                        onClick={() => {
                            if (unlockedCharacters.includes(CHARACTERS[currentCharacterIndex].id)) {
                                selectCharacter(CHARACTERS[currentCharacterIndex].id);
                                setStatus('idle');
                            } else {
                                setStatus('store');
                            }
                        }}
                        className={clsx(
                            "w-full mt-8 font-black py-3 text-lg hover:scale-105 transition-all flex items-center justify-center gap-2",
                            unlockedCharacters.includes(CHARACTERS[currentCharacterIndex].id) 
                            ? "bg-white text-black hover:bg-cyan-400" 
                            : "bg-yellow-600 text-white hover:bg-yellow-500"
                        )}
                      >
                          {unlockedCharacters.includes(CHARACTERS[currentCharacterIndex].id) ? "SELECT RUNNER" : <><ShoppingCart className="w-5 h-5" /> BUY IN STORE</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MENU SCREEN --- */}
      {status === 'idle' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          {/* LOGOUT BUTTON */}
          {user && (
            <div className="absolute top-8 right-8 pointer-events-auto mt-[env(safe-area-inset-top)] mr-[env(safe-area-inset-right)]">
               <button 
                onClick={logout}
                className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors text-sm font-bold uppercase tracking-wider"
               >
                 <LogOut className="w-4 h-4" /> Sign Out
               </button>
            </div>
          )}

          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-300">
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 drop-shadow-[0_0_30px_rgba(0,255,255,0.5)] tracking-tighter italic">
              NEON<br/>SURFER
            </h1>
            <p className="text-xl text-gray-300 font-medium tracking-wide">
              ESCAPE THE DIGITAL VOID
            </p>
            {highScore > 0 && (
                 <div className="inline-block bg-yellow-900/40 border border-yellow-500/30 px-6 py-2 rounded-full">
                     <span className="text-yellow-500 font-bold uppercase tracking-wider text-sm">Best Run: {Math.floor(highScore)}</span>
                 </div>
            )}
            
            <div className="flex flex-col gap-4 items-center">
                <button 
                  onClick={handleStart}
                  className="group relative inline-flex items-center gap-3 px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-2xl rounded-none transform skew-x-[-10deg] transition-all hover:scale-105 active:scale-95 pointer-events-auto"
                >
                  <span className="absolute inset-0 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  <Play className="w-8 h-8 fill-current transform skew-x-[10deg]" />
                  <span className="transform skew-x-[10deg]">START RUN</span>
                </button>

                <div className="flex gap-4">
                    <button 
                      onClick={() => setStatus('garage')}
                      className="group relative inline-flex items-center gap-3 px-8 py-3 bg-transparent border-2 border-white/20 hover:border-white text-white font-bold text-lg rounded-none transform skew-x-[-10deg] transition-all pointer-events-auto hover:bg-white/5"
                    >
                      <User className="w-5 h-5 transform skew-x-[10deg]" />
                      <span className="transform skew-x-[10deg]">GARAGE</span>
                    </button>
                    
                    <button 
                      onClick={() => setStatus('store')}
                      className="group relative inline-flex items-center gap-3 px-8 py-3 bg-yellow-600/20 border-2 border-yellow-500 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 text-yellow-500 font-bold text-lg rounded-none transform skew-x-[-10deg] transition-all pointer-events-auto"
                    >
                      <ShoppingCart className="w-5 h-5 transform skew-x-[10deg]" />
                      <span className="transform skew-x-[10deg]">STORE</span>
                    </button>

                    <button 
                      onClick={() => setStatus('challenges')}
                      className="group relative inline-flex items-center gap-3 px-6 py-3 bg-cyan-900/20 border-2 border-cyan-500 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 text-cyan-400 font-bold text-lg rounded-none transform skew-x-[-10deg] transition-all pointer-events-auto"
                    >
                      <CheckCircle className="w-5 h-5 transform skew-x-[10deg]" />
                      <span className="transform skew-x-[10deg]">QUESTS</span>
                      {hasUnclaimedChallenges && (
                          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-bounce"></span>
                      )}
                    </button>

                    <button 
                      onClick={() => setStatus('leaderboard')}
                      className="group relative inline-flex items-center gap-3 px-6 py-3 bg-purple-900/20 border-2 border-purple-500 hover:bg-purple-500 hover:text-black hover:border-purple-500 text-purple-400 font-bold text-lg rounded-none transform skew-x-[-10deg] transition-all pointer-events-auto"
                    >
                      <Award className="w-5 h-5 transform skew-x-[10deg]" />
                      <span className="transform skew-x-[10deg]">RANK</span>
                    </button>
                </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 text-left max-w-sm mx-auto text-sm text-gray-400">
               <div className="flex items-center gap-2"><div className="w-6 h-6 bg-red-500 rounded-sm"></div> Avoid Walls</div>
               <div className="flex items-center gap-2"><div className="w-6 h-6 bg-purple-600 rounded-sm"></div> Dodge Towers</div>
               <div className="flex items-center gap-2"><div className="w-6 h-6 bg-green-500 rounded-sm"></div> Slide Under</div>
               <div className="flex items-center gap-2"><div className="w-6 h-6 bg-yellow-400 rounded-full"></div> Collect Coins</div>
            </div>
          </div>
        </div>
      )}

      {status === 'paused' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md">
           <div className="text-center space-y-8 animate-in fade-in zoom-in duration-200">
              <h2 className="text-6xl font-black text-white italic tracking-wider">PAUSED</h2>
              
              <div className="flex flex-col gap-4 w-64 mx-auto">
                 <button 
                   onClick={togglePause}
                   className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg rounded-none transform skew-x-[-10deg] transition-all pointer-events-auto"
                 >
                   <Play className="w-5 h-5 fill-current" />
                   RESUME
                 </button>
                 <button 
                   onClick={handleReset}
                   className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-none transform skew-x-[-10deg] transition-all pointer-events-auto"
                 >
                   <MenuIcon className="w-5 h-5" />
                   MENU
                 </button>
              </div>
           </div>
        </div>
      )}

      {status === 'gameover' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/90 backdrop-blur-md">
          <div className="text-center space-y-6 animate-in slide-in-from-bottom duration-300 w-full max-w-md px-4">
            <h2 className="text-6xl font-black text-white drop-shadow-lg italic">CRASHED!</h2>
            
            <div className="bg-black/40 p-6 rounded-2xl border border-white/10 w-full">
              <div className="text-gray-400 text-sm uppercase font-bold mb-1">Final Score</div>
              <div className="text-6xl font-mono font-bold text-yellow-400 mb-6">{Math.floor(score)}</div>
              
              <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm bg-black/20 p-2 rounded">
                    <span className="text-gray-300">Run Coins</span>
                    <span className="font-mono font-bold text-yellow-300">+{coins}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-black/20 p-2 rounded">
                    <span className="text-gray-300">Bank Balance</span>
                    <span className="font-mono font-bold text-yellow-300">{bank}</span>
                  </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={handleStart} 
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-red-900 hover:bg-gray-200 font-black text-xl rounded-xl shadow-xl transition-all hover:-translate-y-1 pointer-events-auto"
                >
                  <RotateCcw className="w-6 h-6" />
                  TRY AGAIN
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleShare}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-colors pointer-events-auto"
                    >
                      <Share2 className="w-4 h-4" />
                      SHARE
                    </button>
                    <button 
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-black/40 hover:bg-black/60 text-white font-bold text-sm rounded-xl border border-white/10 transition-colors pointer-events-auto"
                    >
                      <MenuIcon className="w-4 h-4" />
                      MENU
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;