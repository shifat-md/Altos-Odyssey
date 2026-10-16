// Main React Component for Alto's Odyssey inspired game
import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { GameEngine } from './game/GameEngine';

export function App() {
  const [engineState, setEngineState] = useState({
    gameState: 'TITLE',
    isZenMode: false,
    distance: 0,
    coins: 0,
    score: 0,
    highScore: 0,
    highDistance: 0,
    currentComboScore: 0,
    comboMultiplier: 1,
    currentComboTricks: [],
    scarfBoostActive: false,
    lotusActive: false,
    magnetActive: false,
    currentBiome: null,
    currentTimePeriod: null,
    goals: []
  });

  const engineRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine((newState) => {
      setEngineState({ ...newState });
    });
  }

  const engine = engineRef.current;

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        engine.setJump(true);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowDown' || e.key === 's') {
        engine.setGlide(true);
      } else if (e.code === 'KeyP') {
        if (engine.gameState === 'PLAYING' || engine.gameState === 'ZEN') {
          engine.gameState = 'PHOTO_MODE';
          engine.notifyState();
        } else if (engine.gameState === 'PHOTO_MODE') {
          engine.gameState = engine.isZenMode ? 'ZEN' : 'PLAYING';
          engine.notifyState();
        }
      } else if (e.code === 'Escape') {
        if (engine.gameState === 'PLAYING' || engine.gameState === 'ZEN') {
          engine.gameState = 'PAUSED';
          engine.notifyState();
        } else if (engine.gameState === 'PAUSED') {
          engine.gameState = engine.isZenMode ? 'ZEN' : 'PLAYING';
          engine.notifyState();
        }
      } else if (e.code === 'KeyR' && engine.gameState === 'CRASHED') {
        engine.startNewGame(engine.isZenMode);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        engine.setJump(false);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowDown' || e.key === 's') {
        engine.setGlide(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);

  // Pointer & Touch Controls on the game screen
  const handlePointerDown = (e) => {
    // Only process if clicking on canvas/game area, not on UI buttons
    if (e.target.closest('button') || e.target.closest('input')) return;
    engine.setJump(true);
  };

  const handlePointerUp = () => {
    engine.setJump(false);
  };

  const handleRestart = () => {
    engine.startNewGame(engine.isZenMode);
  };

  const handleTogglePause = () => {
    if (engine.gameState === 'PAUSED') {
      engine.gameState = engine.isZenMode ? 'ZEN' : 'PLAYING';
    } else if (engine.gameState === 'PLAYING' || engine.gameState === 'ZEN') {
      engine.gameState = 'PAUSED';
    }
    engine.notifyState();
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none touch-none bg-slate-950 font-sans"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 2D Canvas Game World */}
      <GameCanvas gameEngine={engine} />

      {/* Modern React Glassmorphism UI Overlay */}
      <GameUI
        gameEngine={engine}
        gameState={engineState}
        onRestart={handleRestart}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
}

export default App;
