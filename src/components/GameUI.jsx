// UI Overlay for Alto's Odyssey inspired game
import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Music, 
  Camera, 
  RotateCcw, 
  Pause, 
  Award, 
  Compass, 
  Coins, 
  Wind,
  Download,
  X,
  Timer,
  Trophy,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/SoundEngine';

export const GameUI = ({ gameEngine, gameState, onRestart, onTogglePause }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [photoFilter, setPhotoFilter] = useState('none');
  const [photoSavedToast, setPhotoSavedToast] = useState(false);

  // Trigger celebration confetti when 2-minute expedition finishes!
  useEffect(() => {
    if (gameState.gameState === 'EXPEDITION_COMPLETE') {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#ffd700']
        });

        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 350);
      } catch (e) {}
    }
  }, [gameState.gameState]);

  const toggleSound = (e) => {
    e.stopPropagation();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const toggleMusic = (e) => {
    e.stopPropagation();
    const musicMuted = soundEngine.toggleMusic();
    setIsMusicMuted(musicMuted);
  };

  const handleStartGame = (zen = false) => {
    gameEngine.startNewGame(zen);
  };

  const handleEnterPhotoMode = (e) => {
    e.stopPropagation();
    gameEngine.gameState = 'PHOTO_MODE';
    gameEngine.photoFilter = photoFilter;
    gameEngine.notifyState();
  };

  const handleExitPhotoMode = (e) => {
    e.stopPropagation();
    gameEngine.gameState = gameEngine.isZenMode ? 'ZEN' : 'PLAYING';
    gameEngine.photoFilter = 'none';
    gameEngine.notifyState();
  };

  const handleSelectFilter = (filter) => {
    setPhotoFilter(filter);
    gameEngine.photoFilter = filter;
  };

  const handleTakeSnapshot = (e) => {
    e.stopPropagation();
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `altos-odyssey-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setPhotoSavedToast(true);
      setTimeout(() => setPhotoSavedToast(false), 2500);
    } catch (err) {
      console.error("Could not capture photo:", err);
    }
  };

  // Format 2-minute timer as MM:SS
  const timeSeconds = Math.max(0, gameState.timeRemaining !== undefined ? gameState.timeRemaining : 120);
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = timeSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isTimeLow = timeSeconds <= 15 && timeSeconds > 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between overflow-hidden">
      {/* 1. TOP BAR HUD (Visible during PLAYING & ZEN) */}
      {(gameState.gameState === 'PLAYING' || gameState.gameState === 'ZEN') && (
        <div className="w-full p-4 sm:p-6 flex items-start justify-between pointer-events-auto">
          {/* Left stats: Distance, Coins, Score */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
                {gameState.distance.toLocaleString()} <span className="text-sm font-normal opacity-75">m</span>
              </span>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full alto-glass-light text-amber-300 font-semibold text-sm">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{gameState.coins}</span>
              </div>
            </div>

            {!gameState.isZenMode ? (
              <div className="text-sm font-medium tracking-wide text-white/80">
                Score: <span className="text-white font-semibold">{gameState.score.toLocaleString()}</span>
                {gameState.highScore > 0 && (
                  <span className="ml-3 text-xs opacity-60">Best: {gameState.highScore.toLocaleString()}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-teal-300 font-semibold animate-pulse-subtle">
                <Wind className="w-3.5 h-3.5" /> Zen Mode
              </div>
            )}

            {/* Current Biome Badge */}
            {gameState.currentBiome && (
              <div className="mt-1 text-xs uppercase tracking-widest text-white/50 font-medium">
                {gameState.currentBiome.name} &bull; {gameState.currentTimePeriod?.name}
              </div>
            )}
          </div>

          {/* Center: 2-Minute Expedition Timer */}
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full alto-glass transition-all duration-300 ${
                isTimeLow
                  ? 'border-red-400 bg-red-950/60 text-red-200 shadow-lg shadow-red-500/20 scale-105 animate-pulse'
                  : 'border-white/20 text-white'
              }`}
            >
              <Timer className={`w-4 h-4 ${isTimeLow ? 'text-red-400' : 'text-amber-300'}`} />
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider">
                {timeDisplay}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-white/50 mt-1">
              {isTimeLow ? "Dusk Approaching" : "2-Min Expedition"}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGoals(!showGoals)}
              title="Challenges / Goals"
              className="p-2.5 rounded-full alto-btn text-white/80 hover:text-white"
            >
              <Award className="w-5 h-5" />
            </button>

            <button
              onClick={handleEnterPhotoMode}
              title="Photo Mode"
              className="p-2.5 rounded-full alto-btn text-white/80 hover:text-white"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              onClick={toggleMusic}
              title={isMusicMuted ? "Unmute Music" : "Mute Music"}
              className="p-2.5 rounded-full alto-btn text-white/80 hover:text-white"
            >
              <Music className={`w-5 h-5 ${isMusicMuted ? 'opacity-40' : 'text-emerald-400'}`} />
            </button>

            <button
              onClick={toggleSound}
              title={isMuted ? "Unmute SFX" : "Mute SFX"}
              className="p-2.5 rounded-full alto-btn text-white/80 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onTogglePause}
              title="Pause"
              className="p-2.5 rounded-full alto-btn text-white/80 hover:text-white"
            >
              <Pause className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. LIVE ACTIVE COMBO HUD (Floating in upper-center during play) */}
      {(gameState.gameState === 'PLAYING' || gameState.gameState === 'ZEN') && gameState.currentComboTricks.length > 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none transition-all duration-200">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full alto-glass border border-amber-400/40 shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-sm font-semibold tracking-wide text-amber-200">
              {gameState.currentComboTricks.join(' + ')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 font-bold text-xs">
              x{gameState.comboMultiplier}
            </span>
          </div>
          <div className="text-xs tracking-wider text-white/70">
            Current combo: +{(gameState.currentComboScore * gameState.comboMultiplier).toLocaleString()} pts
          </div>
        </div>
      )}

      {/* Powerup Active Glow Alerts */}
      {(gameState.scarfBoostActive || gameState.lotusActive) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1 rounded-full alto-glass text-xs font-semibold uppercase tracking-widest text-cyan-300 border border-cyan-400/40 animate-pulse">
          <Wind className="w-4 h-4" />
          {gameState.lotusActive ? "Lotus Flower Shield Active" : "Scarf Boost Active"}
        </div>
      )}

      {/* 3. GOALS / CHALLENGES DRAWER MODAL */}
      {showGoals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-md alto-glass rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold tracking-wide">Desert Goals</h3>
              </div>
              <button
                onClick={() => setShowGoals(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
              {gameState.goals?.map((g) => (
                <div
                  key={g.id}
                  className={`p-3 rounded-xl border transition-all ${
                    g.completed
                      ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                      : 'bg-white/5 border-white/10 text-white/90'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{g.text}</span>
                    <span className="text-xs opacity-75">
                      {g.completed ? '✓ Completed' : `${g.current} / ${g.target}`}
                    </span>
                  </div>
                  {!g.completed && (
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowGoals(false)}
              className="mt-6 w-full py-2.5 rounded-xl alto-btn font-medium"
            >
              Continue Sandboarding
            </button>
          </div>
        </div>
      )}

      {/* 4. TITLE / MAIN SCREEN */}
      {gameState.gameState === 'TITLE' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 text-center pointer-events-auto bg-black/30 backdrop-blur-[2px]">
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full alto-glass-light text-amber-300 text-xs font-semibold tracking-widest uppercase mb-3">
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              2-Minute Desert Expedition
            </div>

            <h1 className="alto-title text-4xl sm:text-6xl font-bold text-white mb-2">
              Alto's Odyssey
            </h1>
            <h2 className="text-lg sm:text-xl font-light text-white/80 tracking-widest mb-5">
              inspired game
            </h2>

            <p className="text-sm sm:text-base text-white/75 max-w-md font-light leading-relaxed mb-8">
              Experience a full day and night in the endless desert in a 2-minute high-speed expedition.
              Sandboard across majestic dunes, leap ancient canyon chasms, and bank massive combos!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mb-8">
              <button
                onClick={() => handleStartGame(false)}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold tracking-wide shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Start 2-Min Run
              </button>

              <button
                onClick={() => handleStartGame(true)}
                className="flex-1 py-3.5 px-6 rounded-2xl alto-glass border border-white/20 hover:bg-white/20 text-white font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Wind className="w-5 h-5 text-teal-300" />
                Zen Mode
              </button>
            </div>

            {/* Controls Guide */}
            <div className="alto-glass rounded-xl p-4 max-w-md w-full border border-white/10 text-xs text-white/70 flex flex-col gap-2 text-left">
              <div className="font-semibold text-white/90 uppercase tracking-wider text-[11px] flex justify-between">
                <span>Controls &amp; Physics</span>
                <span className="text-amber-300 font-mono">120s Run</span>
              </div>
              <div className="flex justify-between">
                <span>Hold Spacebar / Click / Tap</span>
                <span className="text-white">Jump &amp; Backflip</span>
              </div>
              <div className="flex justify-between">
                <span>Align Board with Dunes</span>
                <span className="text-white">Smooth Landing &amp; Speed Surge</span>
              </div>
              <div className="flex justify-between">
                <span>Ropes &amp; Hot Air Balloons</span>
                <span className="text-white">Grind &amp; Super Bounce</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 2-MINUTE EXPEDITION COMPLETE CELEBRATION MODAL */}
      {gameState.gameState === 'EXPEDITION_COMPLETE' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-lg alto-glass rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-amber-400/30 flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              2 Minutes Elapsed
            </div>

            <h2 className="alto-title text-3xl sm:text-4xl font-bold mb-1 text-white">
              Expedition Complete!
            </h2>
            <p className="text-xs sm:text-sm text-white/70 mb-5">
              You journeyed through the desert across day and night!
            </p>

            {/* Rank Ribbon */}
            <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-400/40 mb-6 flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-bold text-amber-200 tracking-wide">
                {gameState.expeditionRank || 'Dune Nomad'}
              </span>
            </div>

            {/* Run Stats */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider opacity-60 mb-1">Total Distance</span>
                <span className="text-2xl font-bold text-white">
                  {gameState.distance.toLocaleString()} <span className="text-xs font-normal">m</span>
                </span>
                {gameState.distance >= gameState.highDistance && gameState.distance > 0 && (
                  <span className="mt-1 text-[10px] font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full">
                    NEW RECORD
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider opacity-60 mb-1">Final Score</span>
                <span className="text-2xl font-bold text-white">{gameState.score.toLocaleString()}</span>
                {gameState.score >= gameState.highScore && gameState.score > 0 && (
                  <span className="mt-1 text-[10px] font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full">
                    NEW HIGH SCORE
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider opacity-60 mb-1">Coins Gathered</span>
                <div className="flex items-center gap-1.5 text-xl font-bold text-amber-300">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>{gameState.coins}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                <span className="text-xs uppercase tracking-wider opacity-60 mb-1">Final Biome</span>
                <span className="text-sm font-semibold text-white/90 mt-1">
                  {gameState.currentBiome?.name || "The Dunes"}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={onRestart}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                Embark on Another 2-Min Run (Space)
              </button>

              <button
                onClick={() => handleStartGame(true)}
                className="w-full py-3 px-6 rounded-2xl alto-glass hover:bg-white/15 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wind className="w-4 h-4 text-teal-300" />
                Endless Zen Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PHOTO MODE OVERLAY */}
      {gameState.gameState === 'PHOTO_MODE' && (
        <div className="fixed inset-0 z-40 flex flex-col justify-between p-6 pointer-events-auto bg-black/10">
          {/* Top banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full alto-glass text-sm font-semibold tracking-wide text-white">
              <Camera className="w-4 h-4 text-amber-400" />
              Photo Mode
            </div>

            <button
              onClick={handleExitPhotoMode}
              className="p-2.5 rounded-full alto-btn text-white"
              title="Close Photo Mode"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder Rule of Thirds Grid */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12 opacity-20">
            <div className="w-full h-px bg-white" style={{ top: '33.3%' }} />
            <div className="w-full h-px bg-white" style={{ top: '66.6%' }} />
          </div>

          {/* Toast Notification when photo saved */}
          {photoSavedToast && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-emerald-500/90 text-white text-sm font-semibold shadow-lg animate-in fade-in">
              Photo Saved to Downloads!
            </div>
          )}

          {/* Bottom Filter & Shutter Controls */}
          <div className="flex flex-col items-center gap-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl alto-glass">
              {['none', 'golden', 'twilight', 'sunset'].map((f) => (
                <button
                  key={f}
                  onClick={() => handleSelectFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                    photoFilter === f
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {f === 'none' ? 'Natural' : f}
                </button>
              ))}
            </div>

            {/* Shutter Button */}
            <button
              onClick={handleTakeSnapshot}
              className="w-16 h-16 rounded-full bg-white hover:bg-amber-100 text-slate-900 shadow-2xl flex items-center justify-center cursor-pointer transition-transform active:scale-90 border-4 border-white/40"
              title="Capture Snapshot"
            >
              <Camera className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* 7. PAUSE MODAL */}
      {gameState.gameState === 'PAUSED' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-auto">
          <div className="w-full max-w-sm alto-glass rounded-3xl p-6 text-center shadow-2xl border border-white/20 flex flex-col items-center">
            <h2 className="alto-title text-2xl font-bold mb-6">Game Paused</h2>

            <div className="flex flex-col gap-3 w-full mb-4">
              <button
                onClick={onTogglePause}
                className="w-full py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume Sandboarding
              </button>

              <button
                onClick={onRestart}
                className="w-full py-3 px-6 rounded-2xl alto-glass hover:bg-white/15 text-white font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restart 2-Min Run
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/10 w-full text-xs text-white/70">
              <button
                onClick={toggleMusic}
                className="flex items-center gap-1.5 hover:text-white"
              >
                <Music className="w-4 h-4" />
                {isMusicMuted ? "Music: Off" : "Music: On"}
              </button>
              <button
                onClick={toggleSound}
                className="flex items-center gap-1.5 hover:text-white"
              >
                <Volume2 className="w-4 h-4" />
                {isMuted ? "SFX: Off" : "SFX: On"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
