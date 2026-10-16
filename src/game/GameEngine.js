// Main Game Engine for Alto's Odyssey inspired game
import { PHYSICS, BIOMES, TIME_PERIODS, TRICKS, INITIAL_GOALS, GAME_CONFIG } from './constants';
import { TerrainGenerator } from './terrain';
import { ParticleSystem } from './particleSystem';
import { soundEngine } from '../audio/SoundEngine';

export class GameEngine {
  constructor(onStateChange) {
    this.onStateChange = onStateChange;

    // State
    this.gameState = 'TITLE'; // 'TITLE', 'PLAYING', 'ZEN', 'CRASHED', 'PAUSED', 'PHOTO_MODE', 'EXPEDITION_COMPLETE'
    this.isZenMode = false;

    // 2-Minute Expedition Timer (120 seconds)
    this.timeRemaining = GAME_CONFIG.EXPEDITION_DURATION;
    this.totalExpeditionTime = GAME_CONFIG.EXPEDITION_DURATION;
    this.lastTickSecond = null;
    this.tumbleTimer = 0;
    this.expeditionRank = '';

    // Canvas / Display dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Subsystems
    this.terrain = new TerrainGenerator();
    this.particles = new ParticleSystem();

    // Camera
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      shake: 0
    };

    // Environment & Biome cycle
    this.biomeIndex = 0;
    this.timeIndex = 0;
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('altos_highscore') || '0', 10);
    this.highDistance = parseInt(localStorage.getItem('altos_highdist') || '0', 10);

    // Active Combo tracking
    this.currentComboTricks = [];
    this.currentComboScore = 0;
    this.comboMultiplier = 1;

    // Missions / Goals
    this.goals = this.loadGoals();

    // Photo Mode configuration
    this.photoFilter = 'none'; // 'none', 'golden', 'twilight', 'sunset', 'bw'
    this.photoPan = { x: 0, y: 0 };
    this.photoZoom = 1.0;

    // Controls input state
    this.input = {
      jumpHeld: false,
      glideHeld: false
    };

    // Player character object
    this.player = this.createPlayer();

    // Initialize scarf
    this.initScarf();

    // Game loop timing
    this.lastFrameTime = performance.now();
    this.gameTime = 0;
    this.runStartTime = 0;
  }

  loadGoals() {
    try {
      const saved = localStorage.getItem('altos_goals');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return JSON.parse(JSON.stringify(INITIAL_GOALS));
  }

  saveGoals() {
    try {
      localStorage.setItem('altos_goals', JSON.stringify(this.goals));
    } catch (e) {}
  }

  createPlayer() {
    return {
      x: 100,
      y: 400,
      vx: PHYSICS.BASE_SPEED,
      vy: 0,
      angle: 0,
      targetAngle: 0,
      angularVelocity: 0,
      isGrounded: true,
      isGrinding: false,
      currentRope: null,
      isAirborne: false,
      flipRotation: 0,
      flipsInAir: 0,
      airborneTime: 0,
      hasCloseShave: false,
      speedBoostTimer: 0,
      lotusTimer: 0,
      magnetTimer: 0,
      wingsuitUnlocked: true,
      scarfPoints: [],
      scarfLength: PHYSICS.BASE_SCARF_LENGTH,
      isCrashing: false,
      crashTimer: 0
    };
  }

  initScarf() {
    this.player.scarfPoints = [];
    for (let i = 0; i < PHYSICS.SCARF_SEGMENTS; i++) {
      this.player.scarfPoints.push({
        x: this.player.x - i * 3,
        y: this.player.y,
        vx: 0,
        vy: 0
      });
    }
  }

  startNewGame(zen = false) {
    soundEngine.init();
    soundEngine.resume();

    this.isZenMode = zen;
    this.gameState = zen ? 'ZEN' : 'PLAYING';
    this.terrain.reset();
    this.particles.clear();

    this.timeRemaining = GAME_CONFIG.EXPEDITION_DURATION;
    this.totalExpeditionTime = GAME_CONFIG.EXPEDITION_DURATION;
    this.lastTickSecond = null;
    this.tumbleTimer = 0;
    this.expeditionRank = '';

    this.player = this.createPlayer();
    const startH = this.terrain.getHeightAndSlopeAt(this.player.x);
    this.player.y = startH.y;
    this.player.angle = startH.angle;
    this.initScarf();

    this.distance = 0;
    this.score = 0;
    this.currentComboTricks = [];
    this.currentComboScore = 0;
    this.comboMultiplier = 1;
    this.runStartTime = performance.now();

    this.camera.x = this.player.x - this.width * 0.35;
    this.camera.y = this.player.y - this.height * 0.65;
    this.camera.zoom = 1.0;

    this.notifyState();
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        gameState: this.gameState,
        isZenMode: this.isZenMode,
        timeRemaining: Math.ceil(this.timeRemaining),
        totalExpeditionTime: this.totalExpeditionTime,
        expeditionRank: this.expeditionRank,
        distance: Math.floor(this.distance),
        coins: this.coins,
        score: this.score,
        highScore: this.highScore,
        highDistance: this.highDistance,
        currentComboScore: this.currentComboScore,
        comboMultiplier: this.comboMultiplier,
        currentComboTricks: [...this.currentComboTricks],
        scarfBoostActive: this.player.speedBoostTimer > 0,
        lotusActive: this.player.lotusTimer > 0,
        magnetActive: this.player.magnetTimer > 0,
        currentBiome: BIOMES[this.biomeIndex],
        currentTimePeriod: TIME_PERIODS[this.timeIndex],
        goals: this.goals
      });
    }
  }

  setJump(isPressed) {
    this.input.jumpHeld = isPressed;
    if (isPressed) {
      soundEngine.resume();
      if (this.gameState === 'TITLE' || this.gameState === 'CRASHED') {
        this.startNewGame(false);
      } else if (this.player.isGrounded || this.player.isGrinding) {
        this.playerJump();
      }
    }
  }

  setGlide(isPressed) {
    this.input.glideHeld = isPressed;
  }

  playerJump() {
    this.player.isGrounded = false;
    this.player.isGrinding = false;
    this.player.currentRope = null;
    this.player.isAirborne = true;
    this.player.vy = PHYSICS.JUMP_FORCE;
    this.player.angularVelocity = -PHYSICS.ROTATION_SPEED * 0.4;
    this.player.flipsInAir = 0;
    this.player.flipRotation = 0;
    this.player.hasCloseShave = false;

    soundEngine.playJump();
    this.particles.emitSandSpray(this.player.x, this.player.y, this.player.angle, this.player.vx);
  }

  // Check and trigger goal completion
  checkGoal(type, value) {
    let updated = false;
    for (const g of this.goals) {
      if (!g.completed && g.type === type) {
        if (type === 'distance' || type === 'combo') {
          if (value > g.current) g.current = value;
        } else {
          g.current += value;
        }

        if (g.current >= g.target) {
          g.completed = true;
          updated = true;
          this.particles.addFloatingText(`Goal Complete: ${g.text}!`, this.player.x + 100, this.player.y - 100, '#ffd700', 22);
        }
      }
    }
    if (updated) this.saveGoals();
  }

  addTrickToCombo(trick) {
    this.currentComboTricks.push(trick.name);
    this.currentComboScore += trick.score || 0;
    this.comboMultiplier = this.currentComboTricks.length;

    // Extend scarf length on trick
    this.player.scarfLength = Math.min(
      PHYSICS.MAX_SCARF_LENGTH,
      this.player.scarfLength + (trick.boostBonus ? trick.boostBonus * 5 : 6)
    );

    // Floating text notification
    this.particles.addFloatingText(
      `+${trick.score || ''} ${trick.name} (x${this.comboMultiplier})`,
      this.player.x,
      this.player.y - 50,
      '#ffffff',
      18
    );

    // Goal checks
    if (trick.name.includes('Backflip')) {
      this.checkGoal('flip', 1);
    }
    if (trick.name.includes('Double')) {
      this.checkGoal('double_flip', 1);
    }
    if (trick.name === TRICKS.BALLOON_BOUNCE.name) {
      this.checkGoal('balloon', 1);
    }
    if (trick.name === TRICKS.GRIND.name) {
      this.checkGoal('grind', 1);
    }
    if (trick.name === TRICKS.ROCK_SMASH.name) {
      this.checkGoal('rock_smash', 1);
    }

    this.notifyState();
  }

  landCombo(quality = 'normal') {
    if (this.currentComboTricks.length > 0) {
      const totalPoints = this.currentComboScore * this.comboMultiplier;
      this.score += totalPoints;

      this.checkGoal('combo', totalPoints);

      this.particles.addFloatingText(
        `Combo Banked! +${totalPoints}`,
        this.player.x,
        this.player.y - 80,
        '#ffeaa7',
        22
      );

      // Speed surge proportional to combo
      const boostAmount = Math.min(8, this.currentComboTricks.length * 1.5);
      this.player.vx = Math.min(PHYSICS.MAX_SPEED, this.player.vx + boostAmount);
      this.player.speedBoostTimer = 3.5; // active scarf boost

      this.currentComboTricks = [];
      this.currentComboScore = 0;
      this.comboMultiplier = 1;
    }

    if (quality === 'perfect') {
      this.player.speedBoostTimer = 5.0;
      this.player.vx = Math.min(PHYSICS.BOOST_SPEED, this.player.vx + 6.0);
      this.particles.addFloatingText("PERFECT LANDING!", this.player.x, this.player.y - 60, '#00cec9', 20);
    } else if (quality === 'great') {
      this.player.vx = Math.min(PHYSICS.MAX_SPEED, this.player.vx + 3.0);
      this.particles.addFloatingText("Great Landing!", this.player.x, this.player.y - 60, '#74b9ff', 18);
    }

    soundEngine.playLanding(quality);
    this.notifyState();
  }

  completeExpedition() {
    this.gameState = 'EXPEDITION_COMPLETE';
    this.player.isCrashing = false;
    soundEngine.playExpeditionComplete();

    // Determine Rank based on score & distance achieved in 2 minutes
    if (this.score >= 20000 || this.distance >= 2500) {
      this.expeditionRank = 'Mythic Dune Prophet';
    } else if (this.score >= 12000 || this.distance >= 1800) {
      this.expeditionRank = 'Master Sandboarder';
    } else if (this.score >= 6000 || this.distance >= 1100) {
      this.expeditionRank = 'Canyon Voyager';
    } else if (this.score >= 2500 || this.distance >= 500) {
      this.expeditionRank = 'Desert Nomad';
    } else {
      this.expeditionRank = 'Wandering Explorer';
    }

    // High scores
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('altos_highscore', this.highScore.toString());
    }
    if (this.distance > this.highDistance) {
      this.highDistance = Math.floor(this.distance);
      localStorage.setItem('altos_highdist', this.highDistance.toString());
    }

    this.particles.addFloatingText("EXPEDITION COMPLETED!", this.player.x, this.player.y - 90, '#ffd700', 26);
    this.notifyState();
  }

  crash() {
    if (this.tumbleTimer > 0) return;

    if (this.isZenMode) {
      soundEngine.playLanding('normal');
      this.player.vy = -3;
      this.player.angularVelocity = 0;
      this.player.angle = this.terrain.getHeightAndSlopeAt(this.player.x).angle;
      this.player.vx = Math.max(PHYSICS.BASE_SPEED, this.player.vx * 0.7);
      this.particles.emitSandSpray(this.player.x, this.player.y, this.player.angle, this.player.vx);
      return;
    }

    // In 2-Minute Odyssey: tumble recovery penalty without premature game over
    this.tumbleTimer = 1.25;
    soundEngine.playCrash();

    // Scatter sand and fragments
    this.particles.emitRockSmash(this.player.x, this.player.y);
    this.particles.emitSandSpray(this.player.x, this.player.y, this.player.angle, 14);
    this.particles.addFloatingText("Wipeout! -Combo", this.player.x, this.player.y - 50, '#ff7675', 18);

    // Drop active combo
    this.currentComboTricks = [];
    this.currentComboScore = 0;
    this.comboMultiplier = 1;

    // Tumble bounce
    this.player.vy = -4.5;
    this.player.vx = Math.max(3.5, this.player.vx * 0.35);
    this.player.angularVelocity = 0.22;
    this.player.isAirborne = true;
    this.player.isGrounded = false;
    this.player.isGrinding = false;

    this.notifyState();
  }

  update(dt) {
    if (this.gameState === 'PAUSED' || this.gameState === 'PHOTO_MODE') return;

    this.gameTime += dt;

    // 2-Minute Expedition Countdown Timer
    if (this.gameState === 'PLAYING' || this.gameState === 'ZEN') {
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);

      // Audio tick during final 10 seconds
      if (this.timeRemaining <= 10 && this.timeRemaining > 0) {
        const sec = Math.ceil(this.timeRemaining);
        if (this.lastTickSecond !== sec) {
          this.lastTickSecond = sec;
          soundEngine.playTimerTick(this.timeRemaining <= 5);
        }
      }

      // 2 Minutes Elapsed!
      if (this.timeRemaining <= 0) {
        this.completeExpedition();
        return;
      }
    }

    // Handling Wipeout Tumble Recovery
    if (this.tumbleTimer > 0) {
      this.tumbleTimer -= dt;
      this.player.x += this.player.vx;
      this.player.y += this.player.vy;
      this.player.vy += PHYSICS.GRAVITY;
      this.player.vx *= 0.94;
      this.player.angle += 0.14;

      const ground = this.terrain.getHeightAndSlopeAt(this.player.x);
      if (this.player.y >= ground.y - 2) {
        this.player.y = ground.y;
        this.player.vy = -1.5;
        this.particles.emitSandSpray(this.player.x, this.player.y, ground.angle, this.player.vx);
      }

      if (this.tumbleTimer <= 0) {
        // Recover onto board!
        this.player.y = ground.y;
        this.player.angle = ground.angle;
        this.player.vx = PHYSICS.BASE_SPEED;
        this.player.vy = 0;
        this.player.angularVelocity = 0;
        this.player.isGrounded = true;
        this.player.isAirborne = false;
        this.particles.addFloatingText("Back on Board!", this.player.x, this.player.y - 60, '#55efc4', 20);
        soundEngine.playLanding('great');
      }

      this.updateScarf();
      this.particles.update(this.width, this.height, TIME_PERIODS[this.timeIndex].isNight);
      this.updateCamera();
      return;
    }

    // 1. Progress Distance and Biomes
    const prevX = this.player.x;

    // Powerup Timers
    if (this.player.speedBoostTimer > 0) this.player.speedBoostTimer -= dt;
    if (this.player.lotusTimer > 0) this.player.lotusTimer -= dt;
    if (this.player.magnetTimer > 0) this.player.magnetTimer -= dt;

    // Scarf length gradual decay if not doing tricks
    if (!this.player.isAirborne && this.player.scarfLength > PHYSICS.BASE_SCARF_LENGTH) {
      this.player.scarfLength -= dt * 4;
    }

    // 2. Grind Physics & Collisions
    let groundContact = false;

    // Check Grind Ropes
    let onRope = null;
    for (const rope of this.terrain.grindRopes) {
      if (this.player.x >= rope.x1 && this.player.x <= rope.x2) {
        const t = (this.player.x - rope.x1) / (rope.x2 - rope.x1);
        const ropeLinearY = rope.y1 + (rope.y2 - rope.y1) * t;
        const ropeSagY = ropeLinearY + Math.sin(t * Math.PI) * rope.sag;

        // Check if player lands onto or is sliding along the rope
        if (Math.abs(this.player.y - ropeSagY) < 18 && this.player.vy >= -2) {
          onRope = { rope, t, ropeY: ropeSagY };
          break;
        }
      }
    }

    if (onRope) {
      if (!this.player.isGrinding) {
        this.addTrickToCombo(TRICKS.GRIND);
      }
      this.player.isGrinding = true;
      this.player.isGrounded = false;
      this.player.isAirborne = false;
      this.player.y = onRope.ropeY;
      this.player.vy = 0;

      // Rope angle
      const ropeDx = onRope.rope.x2 - onRope.rope.x1;
      const ropeDy = onRope.rope.y2 - onRope.rope.y1;
      this.player.angle = Math.atan2(ropeDy, ropeDx);

      // Grind speed maintenance
      this.player.vx = Math.max(PHYSICS.BASE_SPEED * 1.3, this.player.vx * 0.998);

      // Grind sparks & sound
      soundEngine.playGrind();
      this.particles.emitGrindSparks(this.player.x, this.player.y, this.player.vx);
      groundContact = true;
    } else {
      if (this.player.isGrinding) {
        // Disengaged rope
        this.player.isGrinding = false;
        this.player.isAirborne = true;
        this.player.vy = -3; // gentle pop off rope
      }
    }

    // 3. Ground Terrain Collisions
    if (!this.player.isGrinding) {
      const ground = this.terrain.getHeightAndSlopeAt(this.player.x);

      if (this.player.y >= ground.y - 2) {
        // Player is touching sand
        if (this.player.isAirborne) {
          // Landing evaluation!
          let angleDiff = Math.abs(this.player.angle - ground.angle);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

          const hasProtection = this.player.lotusTimer > 0 || this.player.speedBoostTimer > 0;

          if (angleDiff > PHYSICS.CRASH_ANGLE && !hasProtection) {
            // Bad landing crash!
            this.crash();
            return;
          } else {
            // Successful landing
            let quality = 'normal';
            if (angleDiff < PHYSICS.PERFECT_LANDING_ANGLE) {
              quality = 'perfect';
            } else if (angleDiff < PHYSICS.SAFE_LANDING_ANGLE) {
              quality = 'great';
            }

            this.player.isAirborne = false;
            this.player.isGrounded = true;
            this.player.y = ground.y;
            this.player.vy = 0;
            this.player.angle = ground.angle;
            this.landCombo(quality);
          }
        }

        // On ground physics
        this.player.isGrounded = true;
        this.player.isAirborne = false;
        this.player.y = ground.y;
        this.player.angle = ground.angle;

        // Slope acceleration: downhill accelerates board, uphill decelerates
        const slopeSin = Math.sin(ground.angle);
        this.player.vx += slopeSin * PHYSICS.SLOPE_ACCEL;

        // Friction
        this.player.vx *= PHYSICS.FRICTION;

        // Ensure minimum momentum
        if (this.player.vx < PHYSICS.BASE_SPEED * 0.7) {
          this.player.vx = PHYSICS.BASE_SPEED * 0.7;
        }

        // Speed limit
        const maxCurrentSpeed = (this.player.speedBoostTimer > 0 || this.player.lotusTimer > 0)
          ? PHYSICS.BOOST_SPEED
          : PHYSICS.MAX_SPEED;
        if (this.player.vx > maxCurrentSpeed) {
          this.player.vx = maxCurrentSpeed;
        }

        groundContact = true;

        // Sand spray
        this.particles.emitSandSpray(this.player.x, this.player.y, this.player.angle, this.player.vx);

      } else {
        // Airborne physics
        this.player.isGrounded = false;
        this.player.isAirborne = true;

        // Gravity
        this.player.vy += PHYSICS.GRAVITY;
        if (this.player.vy > PHYSICS.MAX_FALL_SPEED) {
          this.player.vy = PHYSICS.MAX_FALL_SPEED;
        }

        // Holding Jump tucks into a backflip!
        if (this.input.jumpHeld) {
          this.player.angularVelocity = -PHYSICS.ROTATION_SPEED;
          this.player.flipRotation += PHYSICS.ROTATION_SPEED;

          soundEngine.playFlipSpin(this.player.angularVelocity);

          // Check full 360 degree backflip completion
          if (this.player.flipRotation >= Math.PI * 2) {
            this.player.flipsInAir++;
            this.player.flipRotation -= Math.PI * 2;

            if (this.player.flipsInAir === 1) {
              this.addTrickToCombo(TRICKS.BACKFLIP);
            } else if (this.player.flipsInAir === 2) {
              this.addTrickToCombo(TRICKS.DOUBLE_FLIP);
            } else {
              this.addTrickToCombo(TRICKS.TRIPLE_FLIP);
            }
          }
        } else {
          // Slowly align toward velocity trajectory when not holding flip
          const targetFlyAngle = Math.atan2(this.player.vy, this.player.vx);
          this.player.angularVelocity *= 0.88;
          this.player.angle += (targetFlyAngle - this.player.angle) * 0.08;
        }

        this.player.angle += this.player.angularVelocity;

        // Wingsuit glide if unlocked and held
        if (this.input.glideHeld && this.player.vy > 0) {
          this.player.vy *= 0.82; // glide lift
          this.player.vx = Math.min(PHYSICS.MAX_SPEED * 1.1, this.player.vx + 0.1);
        }

        // Proximity Flip ("Close Shave") detection
        const distToGround = ground.y - this.player.y;
        const normalizedAngle = ((this.player.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const isUpsideDown = normalizedAngle > Math.PI * 0.7 && normalizedAngle < Math.PI * 1.3;

        if (isUpsideDown && distToGround < 45 && distToGround > 5 && !this.player.hasCloseShave) {
          this.player.hasCloseShave = true;
          this.addTrickToCombo(TRICKS.CLOSE_SHAVE);
        }
      }
    }

    // 4. Balloon Bounce Collisions
    for (const balloon of this.terrain.balloons) {
      const dx = this.player.x - balloon.x;
      const dy = this.player.y - balloon.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check bounce on top half of balloon
      if (dist < balloon.radius + 18 && this.player.y < balloon.y + 10 && this.player.vy > -2) {
        soundEngine.playBalloonBounce();
        this.player.vy = PHYSICS.SUPER_JUMP_FORCE;
        this.player.isAirborne = true;
        this.player.isGrounded = false;
        this.player.isGrinding = false;
        this.addTrickToCombo(TRICKS.BALLOON_BOUNCE);
        this.particles.emitGrindSparks(balloon.x, balloon.y - balloon.radius, 12);
        break;
      }
    }

    // 5. Rock Collisions
    for (const rock of this.terrain.rocks) {
      if (rock.destroyed) continue;

      const rockDist = Math.hypot(this.player.x - rock.x, this.player.y - rock.y);
      if (rockDist < rock.width * 0.65) {
        // Collision with rock!
        const hasSmashPower = this.player.lotusTimer > 0 || this.player.speedBoostTimer > 0;

        if (hasSmashPower) {
          // Smash rock!
          rock.destroyed = true;
          soundEngine.playRockSmash();
          this.particles.emitRockSmash(rock.x, rock.y);
          this.addTrickToCombo(TRICKS.ROCK_SMASH);
        } else if (this.player.vy > 1 && this.player.y < rock.y - 10) {
          // Rock bounce!
          this.player.vy = PHYSICS.JUMP_FORCE * 0.9;
          soundEngine.playLanding('great');
          this.addTrickToCombo(TRICKS.ROCK_BOUNCE);
        } else {
          // Hit rock and crashed!
          this.crash();
          return;
        }
      }
    }

    // 6. Coin Collection & Magnet
    const magnetRadius = this.player.magnetTimer > 0 ? 220 : 38;
    for (const coin of this.terrain.coins) {
      if (coin.collected) continue;

      const cdx = this.player.x - coin.x;
      const cdy = this.player.y - coin.y;
      const cDist = Math.hypot(cdx, cdy);

      if (cDist < magnetRadius) {
        // Magnet pulls coin toward player
        if (this.player.magnetTimer > 0 && cDist > 25) {
          coin.x += (this.player.x - coin.x) * 0.18;
          coin.y += (this.player.y - coin.y) * 0.18;
        }

        if (cDist < 30) {
          coin.collected = true;
          this.coins++;
          this.score += 10;
          soundEngine.playCoin();
          this.particles.emitCoinCollect(coin.x, coin.y);
          this.checkGoal('coins', 1);
        }
      }
    }

    // 7. Powerup Collection
    for (const p of this.terrain.powerups) {
      if (p.collected) continue;

      const pDist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (pDist < 42) {
        p.collected = true;
        if (p.type === 'lotus') {
          this.player.lotusTimer = 12.0;
          soundEngine.playLotusBoost();
          this.particles.addFloatingText("LOTUS FLOWER!", p.x, p.y - 40, '#5ce1e6', 22);
        } else if (p.type === 'magnet') {
          this.player.magnetTimer = 15.0;
          soundEngine.playCoin();
          this.particles.addFloatingText("COIN MAGNET!", p.x, p.y - 40, '#ffd700', 22);
        }
      }
    }

    // 8. Chasm Clearance
    for (const chasm of this.terrain.chasms) {
      if (!chasm.passed && this.player.x > chasm.x2) {
        chasm.passed = true;
        if (!chasm.hasBridge && this.player.isAirborne) {
          this.addTrickToCombo(TRICKS.CHASM_CROSS);
        }
      }
      // Falling into chasm pit
      if (this.player.x > chasm.x1 + 30 && this.player.x < chasm.x2 - 30 && this.player.y > chasm.y1 + 180) {
        this.crash();
        return;
      }
    }

    // 9. Update Player Movement Position
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    // Track Distance
    this.distance += (this.player.x - prevX) * 0.05;
    this.checkGoal('distance', Math.floor(this.distance));

    // 2-Minute Day-Night Cycle: seamlessly maps the 120s run to the 6 time periods (20s each)
    const elapsedExpeditionTime = Math.max(0, this.totalExpeditionTime - this.timeRemaining);
    this.timeIndex = Math.min(
      TIME_PERIODS.length - 1,
      Math.floor((elapsedExpeditionTime / this.totalExpeditionTime) * TIME_PERIODS.length)
    );
    this.biomeIndex = Math.floor(this.distance / 850) % BIOMES.length;

    // 10. Update Scarf Physics
    this.updateScarf();

    // 11. Particles & Terrain Updates
    const currentBiome = BIOMES[this.biomeIndex];
    this.terrain.update(this.player.x, currentBiome.id, this.gameTime);
    this.particles.update(this.width, this.height, TIME_PERIODS[this.timeIndex].isNight);

    // Speed boost particle aura
    if (this.player.speedBoostTimer > 0 || this.player.lotusTimer > 0) {
      this.particles.emitBoostTrail(this.player.x, this.player.y, this.player.lotusTimer > 0);
    }

    // 12. Update Dynamic Sounds
    const currentGroundH = this.terrain.getHeightAndSlopeAt(this.player.x);
    const heightAboveSand = Math.max(0, currentGroundH.y - this.player.y);
    soundEngine.updateDynamicSounds(
      this.player.vx,
      this.player.isGrounded || this.player.isGrinding,
      this.input.glideHeld,
      heightAboveSand
    );

    // 13. Camera Follow
    this.updateCamera();

    // Notify UI every ~100ms or on key changes
    if (Math.floor(this.gameTime) % 6 === 0) {
      this.notifyState();
    }
  }

  updateScarf() {
    // Lead point follows player's shoulders/neck
    const neckX = this.player.x - Math.cos(this.player.angle) * 8 - Math.sin(this.player.angle) * 14;
    const neckY = this.player.y - Math.sin(this.player.angle) * 8 + Math.cos(this.player.angle) * 14;

    this.player.scarfPoints[0].x = neckX;
    this.player.scarfPoints[0].y = neckY;

    const segmentDist = this.player.scarfLength / PHYSICS.SCARF_SEGMENTS;
    const windSpeedX = -(this.player.vx * 0.95 + 4);
    const flutterWave = Math.sin(this.gameTime * 0.02 + this.player.x * 0.05) * 2.5;

    for (let i = 1; i < this.player.scarfPoints.length; i++) {
      const p = this.player.scarfPoints[i];
      const prev = this.player.scarfPoints[i - 1];

      // Wind pull
      p.x += windSpeedX * 0.15;
      p.y += flutterWave * 0.12 + 0.3; // subtle gravity

      // Constrain distance to previous segment
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const currentDist = Math.hypot(dx, dy);

      if (currentDist > 0.001) {
        const factor = segmentDist / currentDist;
        p.x = prev.x + dx * factor;
        p.y = prev.y + dy * factor;
      }
    }
  }

  updateCamera() {
    // Dynamic lookahead based on speed
    const lookAheadX = this.player.vx * 24;
    this.camera.targetX = this.player.x + lookAheadX - this.width * 0.35;
    this.camera.targetY = this.player.y - this.height * 0.62;

    // Smooth camera lag (Lerp)
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.09;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.09;

    // Dynamic zoom: zoom out at high speeds or high in the air
    const speedRatio = Math.min(1.0, this.player.vx / PHYSICS.BOOST_SPEED);
    const heightRatio = Math.min(1.0, Math.max(0, 450 - this.player.y) / 500);
    this.camera.targetZoom = 1.0 - speedRatio * 0.2 - heightRatio * 0.15;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.particles.initAmbientDust(Math.floor(w / 35));
  }
}
