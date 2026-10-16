// High performance Canvas 2D renderer for Alto's Odyssey inspired game
import React, { useRef, useEffect } from 'react';
import { BIOMES, TIME_PERIODS } from '../game/constants';

export const GameCanvas = ({ gameEngine }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameEngine) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      gameEngine.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let lastTime = performance.now();

    // Main 60fps render loop
    const render = (now) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Update physics
      gameEngine.update(dt);

      const width = gameEngine.width;
      const height = gameEngine.height;
      const camera = gameEngine.camera;
      const biome = BIOMES[gameEngine.biomeIndex];
      const timePeriod = TIME_PERIODS[gameEngine.timeIndex];

      ctx.save();

      // 1. Draw Sky Gradient & Celestial Bodies
      drawSky(ctx, width, height, biome, timePeriod, camera, now);

      // Apply camera transformation for world elements
      ctx.save();
      ctx.translate(width * 0.35, height * 0.62);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-camera.x - width * 0.35, -camera.y - height * 0.62);

      // 2. Parallax Mountain Layers (Distant Background)
      drawParallaxMountains(ctx, camera, width, height, biome, timePeriod);

      // 3. Parallax Mid-Dunes
      drawMidDunes(ctx, camera, width, height, biome, timePeriod);

      // 4. Scenery (Ruins, Palms, Archways)
      drawScenery(ctx, gameEngine.terrain.scenery, camera);

      // 5. Hot Air Balloons
      drawBalloons(ctx, gameEngine.terrain.balloons, camera, now);

      // 6. Grind Ropes & Bunting
      drawGrindRopes(ctx, gameEngine.terrain.grindRopes, camera, now);

      // 7. Foreground Playable Dunes
      drawForegroundDunes(ctx, gameEngine.terrain, camera, width, height, biome, timePeriod);

      // 8. Rocks / Boulders
      drawRocks(ctx, gameEngine.terrain.rocks, camera);

      // 9. Coins & Powerups
      drawPickups(ctx, gameEngine.terrain.coins, gameEngine.terrain.powerups, camera, now);

      // 10. Draw Alto & Sandboard & Scarf
      drawPlayer(ctx, gameEngine.player, camera, now);

      // 11. World Particles (Sand spray, sparks, debris)
      gameEngine.particles.draw(ctx, camera);

      ctx.restore(); // Restore camera transformation

      // 12. Screen space weather effects & ambient dust & shooting stars
      gameEngine.particles.drawScreenEffects(ctx, width, height, now);

      // 13. Dynamic Ambient Lighting & Time Tint
      drawAtmosphereOverlay(ctx, width, height, timePeriod, gameEngine.photoFilter);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameEngine]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block w-full h-full cursor-pointer select-none touch-none"
    />
  );
};

// --- RENDERING HELPERS ---

function drawSky(ctx, width, height, biome, timePeriod, camera, now) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, biome.skyTop);
  gradient.addColorStop(1, biome.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Stars during night / dusk / twilight
  if (timePeriod.starOpacity > 0.05) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    // Deterministic starry night using grid hash
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      const sx = ((i * 137.5) % width);
      const sy = ((i * 83.1) % (height * 0.75));
      const twinkle = Math.sin(now * 0.003 + i) * 0.4 + 0.6;
      ctx.globalAlpha = timePeriod.starOpacity * twinkle;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 1.8 : 1.1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Celestial Body: Sun or Crescent Moon
  ctx.save();
  const celestialX = width * 0.75 - (camera.x * 0.015) % (width * 1.5);
  const celestialY = height * timePeriod.sunY;

  if (!timePeriod.isNight) {
    // Majestic Sun with soft radiant aura
    const sunGlow = ctx.createRadialGradient(celestialX, celestialY, 15, celestialX, celestialY, 120);
    sunGlow.addColorStop(0, biome.sunColor);
    sunGlow.addColorStop(0.3, 'rgba(255, 230, 180, 0.4)');
    sunGlow.addColorStop(1, 'rgba(255, 200, 150, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 120, 0, Math.PI * 2);
    ctx.fill();

    // Solid sun core
    ctx.fillStyle = biome.sunColor;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 32, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Glowing Crescent Moon
    ctx.fillStyle = '#f8f9fa';
    ctx.shadowColor = 'rgba(240, 245, 255, 0.8)';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 28, 0, Math.PI * 2);
    ctx.fill();

    // Cutout for crescent
    ctx.fillStyle = biome.skyTop;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(celestialX + 10, celestialY - 6, 23, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParallaxMountains(ctx, camera, width, height, biome, timePeriod) {
  ctx.save();
  const parallax = 0.12;
  const offsetX = camera.x * parallax;

  ctx.fillStyle = biome.mountainFar;
  ctx.beginPath();
  ctx.moveTo(camera.x - 200, camera.y + height);

  // Procedural jagged canyon peaks
  for (let x = camera.x - 300; x < camera.x + width / camera.zoom + 300; x += 180) {
    const peakHash = Math.sin((x + offsetX) * 0.0018) * 160 + Math.cos((x + offsetX) * 0.004) * 80;
    const peakY = camera.y + height * 0.35 + peakHash;
    ctx.lineTo(x, peakY);
  }
  ctx.lineTo(camera.x + width / camera.zoom + 400, camera.y + height + 500);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMidDunes(ctx, camera, width, height, biome, timePeriod) {
  ctx.save();
  const parallax = 0.35;
  const offsetX = camera.x * parallax;

  ctx.fillStyle = biome.duneFar;
  ctx.beginPath();
  ctx.moveTo(camera.x - 200, camera.y + height);

  for (let x = camera.x - 300; x < camera.x + width / camera.zoom + 300; x += 120) {
    const wave = Math.sin((x + offsetX) * 0.0028) * 90 + Math.sin((x + offsetX) * 0.006) * 40;
    const duneY = camera.y + height * 0.48 + wave;
    ctx.lineTo(x, duneY);
  }
  ctx.lineTo(camera.x + width / camera.zoom + 400, camera.y + height + 600);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawForegroundDunes(ctx, terrain, camera, width, height, biome, timePeriod) {
  ctx.save();

  // Create subtle sand gradient
  const sandGrad = ctx.createLinearGradient(0, camera.y, 0, camera.y + height * 1.5);
  sandGrad.addColorStop(0, biome.duneFront);
  sandGrad.addColorStop(0.5, biome.duneMid);
  sandGrad.addColorStop(1, '#1b1220');

  ctx.fillStyle = sandGrad;
  ctx.beginPath();

  const startX = camera.x - 200;
  const endX = camera.x + width / camera.zoom + 300;
  const step = 20;

  ctx.moveTo(startX, camera.y + height + 600);

  // Trace Hermite spline dune surface
  for (let x = startX; x <= endX; x += step) {
    const h = terrain.getHeightAndSlopeAt(x);
    ctx.lineTo(x, h.y);
  }

  ctx.lineTo(endX, camera.y + height + 600);
  ctx.closePath();
  ctx.fill();

  // Glowing dune crest highlight line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += step) {
    const h = terrain.getHeightAndSlopeAt(x);
    if (x === startX) ctx.moveTo(x, h.y);
    else ctx.lineTo(x, h.y);
  }
  ctx.stroke();

  ctx.restore();
}

function drawGrindRopes(ctx, ropes, camera, now) {
  ctx.save();
  for (const rope of ropes) {
    const dx = rope.x2 - rope.x1;
    const dy = rope.y2 - rope.y1;
    const count = 30;

    // Support pillars
    ctx.fillStyle = '#2d212b';
    ctx.fillRect(rope.x1 - 4, rope.y1, 8, 200);
    ctx.fillRect(rope.x2 - 4, rope.y2, 8, 200);

    // Cable line with catenary sag
    ctx.strokeStyle = '#e2c290';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = rope.x1 + dx * t;
      const y = rope.y1 + dy * t + Math.sin(t * Math.PI) * rope.sag;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Prayer Bunting Flags along the rope
    if (rope.bunting) {
      const flagColors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
      for (let i = 2; i < count - 2; i += 2) {
        const t = i / count;
        const x = rope.x1 + dx * t;
        const y = rope.y1 + dy * t + Math.sin(t * Math.PI) * rope.sag;
        const color = flagColors[(i / 2) % flagColors.length];

        const flutter = Math.sin(now * 0.008 + i) * 3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10, y + 12 + flutter);
        ctx.lineTo(x - 4, y + 10 + flutter);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawBalloons(ctx, balloons, camera, now) {
  ctx.save();
  for (const b of balloons) {
    ctx.save();
    ctx.translate(b.x, b.y);

    // Colors
    const palette = [
      { body: '#e74c3c', stripe: '#f1c40f' },
      { body: '#3498db', stripe: '#ffffff' },
      { body: '#9b59b6', stripe: '#e67e22' },
      { body: '#1abc9c', stripe: '#f39c12' },
      { body: '#e67e22', stripe: '#ecf0f1' }
    ][b.colorIndex % 5];

    // Balloon Canopy (Teardrop / oval shape)
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.arc(0, -10, b.radius, Math.PI * 0.8, Math.PI * 0.2, false);
    ctx.lineTo(b.radius * 0.4, b.radius * 0.8);
    ctx.lineTo(-b.radius * 0.4, b.radius * 0.8);
    ctx.closePath();
    ctx.fill();

    // Center contrasting silk stripe
    ctx.fillStyle = palette.stripe;
    ctx.beginPath();
    ctx.ellipse(0, -6, b.radius * 0.42, b.radius * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top bouncy dome highlight (visual cue that it bounces player!)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -10, b.radius, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();

    // Suspension ropes
    ctx.strokeStyle = '#4a3b32';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-b.radius * 0.35, b.radius * 0.8);
    ctx.lineTo(-b.radius * 0.2, b.radius * 1.35);
    ctx.moveTo(b.radius * 0.35, b.radius * 0.8);
    ctx.lineTo(b.radius * 0.2, b.radius * 1.35);
    ctx.stroke();

    // Wicker Basket
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-b.radius * 0.25, b.radius * 1.35, b.radius * 0.5, b.radius * 0.32);

    // Burner fire flicker
    const flameSize = 6 + Math.sin(now * 0.02 + b.floatOffset) * 2.5;
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(0, b.radius * 1.05, flameSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  ctx.restore();
}

function drawRocks(ctx, rocks, camera) {
  ctx.save();
  for (const rock of rocks) {
    if (rock.destroyed) continue;
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);

    // Angular ancient desert rock silhouette
    ctx.fillStyle = '#3a2d36';
    ctx.beginPath();
    ctx.moveTo(-rock.width * 0.5, 0);
    ctx.lineTo(-rock.width * 0.35, -rock.height * 0.7);
    ctx.lineTo(0, -rock.height);
    ctx.lineTo(rock.width * 0.4, -rock.height * 0.85);
    ctx.lineTo(rock.width * 0.55, 0);
    ctx.closePath();
    ctx.fill();

    // Highlight edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

function drawPickups(ctx, coins, powerups, camera, now) {
  ctx.save();

  // Coins
  for (const coin of coins) {
    if (coin.collected) continue;
    ctx.save();
    ctx.translate(coin.x, coin.y);

    // Golden glow
    ctx.shadowColor = '#f39c12';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd700';

    // Spinning elliptical coin
    const spinWidth = Math.abs(Math.sin(now * 0.005 + coin.x * 0.1)) * 7 + 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, spinWidth, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Powerups (Lotus Flower & Magnet)
  for (const p of powerups) {
    if (p.collected) continue;
    ctx.save();
    const bob = Math.sin(now * 0.004 + p.pulseOffset) * 6;
    ctx.translate(p.x, p.y + bob);

    if (p.type === 'lotus') {
      // Ethereal Lotus Flower
      ctx.shadowColor = '#5ce1e6';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffffff';

      // 5 petals
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -9, 4, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#5ce1e6';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Magnet
      ctx.shadowColor = '#f1c40f';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 9, Math.PI, 0);
      ctx.stroke();

      // Silver tips
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(-11, 0, 4, 6);
      ctx.fillRect(7, 0, 4, 6);
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawScenery(ctx, scenery, camera) {
  ctx.save();
  ctx.fillStyle = '#2f212e';

  for (const item of scenery) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    ctx.scale(item.scale, item.scale);

    if (item.type === 'temple_column') {
      // Ancient Roman/Egyptian temple column
      ctx.fillRect(-8, -80, 16, 80);
      ctx.fillRect(-13, -85, 26, 7);
      ctx.fillRect(-11, -7, 22, 7);
    } else if (item.type === 'archway') {
      // Ruin archway
      ctx.fillRect(-35, -90, 10, 90);
      ctx.fillRect(25, -90, 10, 90);
      ctx.beginPath();
      ctx.arc(0, -90, 35, Math.PI, 0);
      ctx.lineTo(35, -100);
      ctx.lineTo(-35, -100);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'palm_tree') {
      // Desert Date Palm
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(15, -45, 10, -90);
      ctx.lineTo(4, -90);
      ctx.quadraticCurveTo(8, -45, 0, 0);
      ctx.closePath();
      ctx.fill();

      // Fronds
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(7, -90);
        ctx.rotate((i - 2) * 0.4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(20, -10, 35, 15);
        ctx.quadraticCurveTo(20, 5, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (item.type === 'ship_ribs') {
      // Buried desert shipwreck hull ribs
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        ctx.arc(r * 20 - 30, 0, 35 - r * 4, Math.PI, Math.PI * 1.55);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2f212e';
        ctx.stroke();
      }
    }

    ctx.restore();
  }
  ctx.restore();
}

function drawPlayer(ctx, player, camera, now) {
  ctx.save();

  // Draw Dynamic Scarf FIRST (behind Alto)
  if (player.scarfPoints && player.scarfPoints.length > 1) {
    ctx.save();
    const isLotus = player.lotusTimer > 0;
    const isBoost = player.speedBoostTimer > 0;

    // Scarf color: radiant glowing cyan during lotus, gold during boost, classic crimson red normally
    let scarfColor = '#d63031';
    if (isLotus) scarfColor = '#00cec9';
    else if (isBoost) scarfColor = '#ffeaa7';

    ctx.strokeStyle = scarfColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isLotus || isBoost) {
      ctx.shadowColor = scarfColor;
      ctx.shadowBlur = 12;
    }

    // Tapered segmented ribbon
    for (let i = 0; i < player.scarfPoints.length - 1; i++) {
      const p1 = player.scarfPoints[i];
      const p2 = player.scarfPoints[i + 1];
      const t = i / player.scarfPoints.length;
      const width = Math.max(1.8, 5.5 * (1 - t * 0.65));

      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Alto Character & Board
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  // Sandboard
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  // Upturned tip board
  ctx.moveTo(-16, -2);
  ctx.lineTo(16, -2);
  ctx.quadraticCurveTo(22, -6, 25, -9);
  ctx.lineTo(24, -6);
  ctx.quadraticCurveTo(17, 0, 14, 0);
  ctx.lineTo(-15, 0);
  ctx.quadraticCurveTo(-18, -3, -20, -6);
  ctx.closePath();
  ctx.fill();

  // Alto Rider Silhouette
  ctx.fillStyle = '#221a24';

  // Legs/boots
  ctx.fillRect(-6, -8, 4, 7);
  ctx.fillRect(4, -8, 4, 7);

  // Torso / poncho
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(5, -22);
  ctx.lineTo(-6, -22);
  ctx.closePath();
  ctx.fill();

  // Head with beanie/turban
  ctx.beginPath();
  ctx.arc(0, -25, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Active Lotus / Boost Aura Ring
  if (player.lotusTimer > 0 || player.speedBoostTimer > 0) {
    ctx.save();
    ctx.strokeStyle = player.lotusTimer > 0 ? '#5ce1e6' : '#ffd700';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, -14, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawAtmosphereOverlay(ctx, width, height, timePeriod, photoFilter) {
  ctx.save();

  // Ambient time tint
  if (timePeriod.ambientFilter) {
    ctx.fillStyle = timePeriod.ambientFilter;
    ctx.fillRect(0, 0, width, height);
  }

  // Vignette effect for dramatic cinematic photography
  const vignette = ctx.createRadialGradient(
    width * 0.5, height * 0.5, width * 0.35,
    width * 0.5, height * 0.5, width * 0.75
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Photo mode filters
  if (photoFilter && photoFilter !== 'none') {
    if (photoFilter === 'golden') {
      ctx.fillStyle = 'rgba(255, 180, 50, 0.18)';
      ctx.fillRect(0, 0, width, height);
    } else if (photoFilter === 'twilight') {
      ctx.fillStyle = 'rgba(120, 50, 190, 0.22)';
      ctx.fillRect(0, 0, width, height);
    } else if (photoFilter === 'sunset') {
      ctx.fillStyle = 'rgba(255, 80, 100, 0.2)';
      ctx.fillRect(0, 0, width, height);
    }
  }

  ctx.restore();
}
