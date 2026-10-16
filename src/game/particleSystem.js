// High performance particle system for Alto's Odyssey aesthetic

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.ambientDust = [];
    this.shootingStars = [];
    this.initAmbientDust(45);
  }

  initAmbientDust(count) {
    this.ambientDust = [];
    for (let i = 0; i < count; i++) {
      this.ambientDust.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2.2 + 0.8,
        speedX: -(Math.random() * 1.5 + 0.5),
        speedY: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.4 + 0.1,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }

  // Sand spray when carving the dunes
  emitSandSpray(x, y, angle, speed, color = '#f39c6b') {
    const count = Math.min(6, Math.floor(speed * 0.4) + 1);
    for (let i = 0; i < count; i++) {
      const sprayAngle = angle + Math.PI + (Math.random() - 0.5) * 0.7;
      const pSpeed = (Math.random() * 0.6 + 0.3) * speed;
      this.particles.push({
        type: 'sand',
        x: x - Math.cos(angle) * 10,
        y: y - Math.sin(angle) * 10,
        vx: Math.cos(sprayAngle) * pSpeed,
        vy: Math.sin(sprayAngle) * pSpeed - Math.random() * 2,
        size: Math.random() * 3 + 1.5,
        color: color,
        alpha: 0.8,
        decay: Math.random() * 0.03 + 0.02,
        gravity: 0.22
      });
    }
  }

  // Grind sparks
  emitGrindSparks(x, y, speed) {
    const count = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < count; i++) {
      const sparkAngle = Math.random() * Math.PI * 2;
      const pSpeed = Math.random() * 6 + 2;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(sparkAngle) * pSpeed - speed * 0.3,
        vy: Math.sin(sparkAngle) * pSpeed - 2,
        size: Math.random() * 2.5 + 1,
        color: Math.random() > 0.4 ? '#fff4cc' : '#ffa500',
        alpha: 1.0,
        decay: 0.05 + Math.random() * 0.05,
        gravity: 0.3
      });
    }
  }

  // Boost trail / lotus aura
  emitBoostTrail(x, y, isLotus) {
    this.particles.push({
      type: 'boost',
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: -(Math.random() * 3 + 2),
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 5 + 3,
      color: isLotus ? '#5ce1e6' : '#ffdd59',
      alpha: 0.85,
      decay: 0.04,
      gravity: -0.05
    });
  }

  // Rock smash explosion
  emitRockSmash(x, y) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 4;
      this.particles.push({
        type: 'debris',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 6 + 3,
        color: '#42333b',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        alpha: 1.0,
        decay: 0.02,
        gravity: 0.45
      });
    }
  }

  // Coin collect sparkles
  emitCoinCollect(x, y) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: '#ffd700',
        alpha: 1.0,
        decay: 0.035,
        gravity: 0.05
      });
    }
  }

  // Floating trick text notification
  addFloatingText(text, x, y, color = '#ffffff', fontSize = 16) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -1.8,
      alpha: 1.0,
      decay: 0.022,
      color: color,
      fontSize: fontSize
    });
  }

  // Occasional shooting star across the sky
  maybeSpawnShootingStar(width, height, isNight) {
    if (!isNight) return;
    if (Math.random() < 0.008 && this.shootingStars.length < 3) {
      this.shootingStars.push({
        x: Math.random() * width + 200,
        y: Math.random() * (height * 0.4),
        length: Math.random() * 90 + 50,
        speed: Math.random() * 14 + 10,
        angle: Math.PI * 0.8 + (Math.random() - 0.5) * 0.2,
        alpha: 1.0,
        decay: 0.025
      });
    }
  }

  update(screenWidth, screenHeight, isNight = false) {
    // 1. Update regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      if (p.rotation !== undefined) {
        p.rotation += p.vRot;
      }
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= ft.decay;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 3. Update ambient dust
    this.maybeSpawnShootingStar(screenWidth, screenHeight, isNight);
    for (let i = 0; i < this.ambientDust.length; i++) {
      const d = this.ambientDust[i];
      d.x += d.speedX;
      d.y += d.speedY;
      if (d.x < 0) d.x = screenWidth + 20;
      if (d.y < 0) d.y = screenHeight;
      if (d.y > screenHeight) d.y = 0;
    }

    // 4. Update shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i];
      star.x += Math.cos(star.angle) * star.speed;
      star.y += Math.sin(star.angle) * star.speed;
      star.alpha -= star.decay;
      if (star.alpha <= 0 || star.x < -100 || star.y > screenHeight) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  draw(ctx, camera) {
    ctx.save();

    // Draw world particles (affected by camera)
    for (const p of this.particles) {
      const screenX = p.x - camera.x;
      const screenY = p.y - camera.y;

      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.type === 'debris') {
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw floating texts
    for (const ft of this.floatingTexts) {
      const screenX = ft.x - camera.x;
      const screenY = ft.y - camera.y;

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = `600 ${ft.fontSize}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, screenX, screenY);
      ctx.restore();
    }

    ctx.restore();
  }

  drawScreenEffects(ctx, width, height, time = 0) {
    ctx.save();

    // Draw shooting stars in background
    for (const star of this.shootingStars) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, star.alpha);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(
        star.x - Math.cos(star.angle) * star.length,
        star.y - Math.sin(star.angle) * star.length
      );
      ctx.stroke();
      ctx.restore();
    }

    // Draw ambient floating dust
    ctx.fillStyle = '#ffffff';
    for (const d of this.ambientDust) {
      const pulse = Math.sin(time * d.pulseSpeed + d.pulseOffset);
      const alpha = Math.max(0.05, Math.min(0.6, d.alpha + pulse * 0.15));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shootingStars = [];
  }
}
