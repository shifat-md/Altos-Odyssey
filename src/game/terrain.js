// Infinite procedural terrain generator for Alto's Odyssey inspired game

export class TerrainGenerator {
  constructor() {
    this.controlPoints = [];
    this.pointsStep = 120; // Distance between control points
    this.currentX = 0;
    this.currentY = 450;
    this.generatedUpToX = 0;

    // Interactive gameplay objects
    this.grindRopes = [];
    this.balloons = [];
    this.rocks = [];
    this.coins = [];
    this.powerups = [];
    this.scenery = [];
    this.chasms = [];

    // Reset and seed initial flat runway
    this.reset();
  }

  reset() {
    this.controlPoints = [];
    this.grindRopes = [];
    this.balloons = [];
    this.rocks = [];
    this.coins = [];
    this.powerups = [];
    this.scenery = [];
    this.chasms = [];

    this.currentX = -600;
    this.currentY = 500;
    this.generatedUpToX = -600;

    // Initial smooth takeoff runway (flat gentle slope)
    for (let x = -600; x <= 800; x += this.pointsStep) {
      this.controlPoints.push({
        x: x,
        y: 480 + (x > 0 ? (x / 800) * 80 : 0)
      });
      this.currentX = x;
      this.currentY = this.controlPoints[this.controlPoints.length - 1].y;
    }
    this.generatedUpToX = 800;

    // Generate upcoming world ahead
    this.generateAhead(3500, 'dunes');
  }

  // Hermite / Catmull-Rom spline evaluation
  getHeightAndSlopeAt(x) {
    // If before first point
    if (this.controlPoints.length === 0) return { y: 500, slope: 0, angle: 0 };
    if (x <= this.controlPoints[0].x) {
      return { y: this.controlPoints[0].y, slope: 0, angle: 0 };
    }

    // Binary search or linear search for surrounding points
    let idx = Math.floor((x - this.controlPoints[0].x) / this.pointsStep);
    if (idx < 0) idx = 0;
    if (idx >= this.controlPoints.length - 2) {
      idx = Math.max(0, this.controlPoints.length - 3);
    }

    // Adjust idx to ensure x is between controlPoints[idx] and controlPoints[idx+1]
    while (idx < this.controlPoints.length - 2 && this.controlPoints[idx + 1].x < x) {
      idx++;
    }
    while (idx > 0 && this.controlPoints[idx].x > x) {
      idx--;
    }

    const p0 = this.controlPoints[Math.max(0, idx - 1)];
    const p1 = this.controlPoints[idx];
    const p2 = this.controlPoints[Math.min(this.controlPoints.length - 1, idx + 1)];
    const p3 = this.controlPoints[Math.min(this.controlPoints.length - 1, idx + 2)];

    const span = p2.x - p1.x;
    if (span <= 0) return { y: p1.y, slope: 0, angle: 0 };

    const t = (x - p1.x) / span;
    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom cubic interpolation
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    // Tangent derivative for exact slope and angle
    const dy = 0.5 * (
      (-p0.y + p2.y) +
      2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t +
      3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2
    ) / span;

    const angle = Math.atan(dy);
    return { y, slope: dy, angle };
  }

  generateAhead(targetDistanceX, biomeId = 'dunes') {
    while (this.generatedUpToX < targetDistanceX) {
      this.generateSegment(biomeId);
    }
  }

  generateSegment(biomeId) {
    const isCanyon = biomeId === 'canyons';
    const isOasis = biomeId === 'oasis';

    // Decide pattern type: Regular dune, Big hill kicker, Long descent, Chasm, or Canyon dip
    const rand = Math.random();
    let numPoints = 8;
    let waveAmplitude = 120 + Math.random() * 100;
    let waveLength = 700 + Math.random() * 500;

    if (rand < 0.15 && this.generatedUpToX > 1500) {
      // Chasm / Ravine Gap
      this.generateChasm();
      return;
    }

    if (rand < 0.4) {
      // Big Launch Hill
      waveAmplitude = 200 + Math.random() * 120;
      waveLength = 900 + Math.random() * 400;
      numPoints = 12;
    } else if (rand < 0.7) {
      // Roller-coaster double dunes
      waveAmplitude = 90 + Math.random() * 60;
      waveLength = 550 + Math.random() * 300;
      numPoints = 10;
    }

    const startX = this.currentX;
    const baseY = this.currentY;

    // Generate sinusoidal dune profile
    for (let i = 1; i <= numPoints; i++) {
      this.currentX += this.pointsStep;
      const progress = (this.currentX - startX) / waveLength;
      // Gentle base drift + sine wave + slight micro noise
      const targetY = baseY + Math.sin(progress * Math.PI * 2) * waveAmplitude + (Math.random() - 0.5) * 20;

      // Clamp terrain within aesthetic bounds (heights between 260 and 700)
      this.currentY = Math.max(260, Math.min(700, targetY));
      this.controlPoints.push({ x: this.currentX, y: this.currentY });
    }

    const segEndX = this.currentX;
    this.generatedUpToX = segEndX;

    // Procedural entities generation in this segment
    this.spawnEntitiesInSegment(startX, segEndX, biomeId);
  }

  generateChasm() {
    const chasmWidth = 480 + Math.random() * 240;
    const startX = this.currentX;
    const chasmStartY = this.currentY;

    // Chasm edge launch kicker
    this.currentX += this.pointsStep;
    this.currentY -= 35; // slight ramp up
    this.controlPoints.push({ x: this.currentX, y: this.currentY });

    const cliffLeftX = this.currentX;
    const cliffLeftY = this.currentY;

    // Deep pit points
    this.controlPoints.push({ x: cliffLeftX + 50, y: cliffLeftY + 850 });
    this.controlPoints.push({ x: cliffLeftX + chasmWidth - 50, y: cliffLeftY + 850 });

    // Landing cliff
    this.currentX = cliffLeftX + chasmWidth;
    this.currentY = cliffLeftY + 80; // slightly lower landing
    this.controlPoints.push({ x: this.currentX, y: this.currentY });

    this.chasms.push({
      x1: cliffLeftX,
      y1: cliffLeftY,
      x2: this.currentX,
      y2: this.currentY,
      width: chasmWidth,
      hasBridge: Math.random() < 0.65,
      passed: false
    });

    const chasmObj = this.chasms[this.chasms.length - 1];

    // If it has a rope bridge across the chasm
    if (chasmObj.hasBridge) {
      this.grindRopes.push({
        id: `bridge_${Math.floor(cliffLeftX)}`,
        x1: cliffLeftX - 10,
        y1: cliffLeftY - 15,
        x2: this.currentX + 10,
        y2: this.currentY - 15,
        sag: 35,
        type: 'bridge',
        bunting: true
      });
    } else {
      // Hot air balloon floating inside the chasm for bounce rescue!
      this.balloons.push({
        x: cliffLeftX + chasmWidth * 0.5,
        y: cliffLeftY + 20,
        baseY: cliffLeftY + 20,
        radius: 38,
        colorIndex: Math.floor(Math.random() * 4),
        floatOffset: Math.random() * Math.PI * 2,
        bounced: false
      });
    }

    // Arc of coins crossing the chasm
    this.spawnCoinArc(cliffLeftX + 40, cliffLeftY - 30, this.currentX - 40, this.currentY - 30, 8, -120);

    this.generatedUpToX = this.currentX;
  }

  spawnEntitiesInSegment(startX, endX, biomeId) {
    const length = endX - startX;
    const midX = startX + length * 0.5;

    // 1. Grind Ropes / Ruins Wires
    if (Math.random() < 0.45 && length > 600) {
      const ropeStartX = startX + 120 + Math.random() * 100;
      const ropeLength = 350 + Math.random() * 250;
      const startH = this.getHeightAndSlopeAt(ropeStartX);
      const endH = this.getHeightAndSlopeAt(ropeStartX + ropeLength);

      this.grindRopes.push({
        id: `rope_${Math.floor(ropeStartX)}`,
        x1: ropeStartX,
        y1: startH.y - 75,
        x2: ropeStartX + ropeLength,
        y2: endH.y - 50,
        sag: 18,
        type: 'ruin_wire',
        bunting: Math.random() < 0.8
      });

      // Line of coins along the rope
      const coinCount = Math.floor(ropeLength / 60);
      for (let i = 1; i < coinCount; i++) {
        const t = i / coinCount;
        this.coins.push({
          x: ropeStartX + ropeLength * t,
          y: (startH.y - 75) * (1 - t) + (endH.y - 50) * t - 18,
          collected: false
        });
      }
    }

    // 2. Hot Air Balloons
    if (Math.random() < 0.35) {
      const balloonX = midX + (Math.random() - 0.5) * 200;
      const groundH = this.getHeightAndSlopeAt(balloonX);
      const balloonY = groundH.y - 140 - Math.random() * 80;

      this.balloons.push({
        x: balloonX,
        y: balloonY,
        baseY: balloonY,
        radius: 40 + Math.random() * 10,
        colorIndex: Math.floor(Math.random() * 5),
        floatOffset: Math.random() * Math.PI * 2,
        bounced: false
      });

      // Coin circle or crown above balloon
      this.coins.push({ x: balloonX - 25, y: balloonY - 60, collected: false });
      this.coins.push({ x: balloonX, y: balloonY - 75, collected: false });
      this.coins.push({ x: balloonX + 25, y: balloonY - 60, collected: false });
    }

    // 3. Rocks / Boulders
    if (Math.random() < 0.45) {
      const rockX = startX + 200 + Math.random() * (length - 350);
      const groundH = this.getHeightAndSlopeAt(rockX);
      // Place rock on ground
      this.rocks.push({
        x: rockX,
        y: groundH.y - 4,
        width: 32 + Math.random() * 16,
        height: 28 + Math.random() * 14,
        angle: groundH.angle,
        destroyed: false
      });
    }

    // 4. Powerups (Lotus Flower or Coin Magnet)
    if (Math.random() < 0.12) {
      const pX = midX + (Math.random() - 0.5) * 150;
      const groundH = this.getHeightAndSlopeAt(pX);
      this.powerups.push({
        type: Math.random() < 0.6 ? 'lotus' : 'magnet',
        x: pX,
        y: groundH.y - 45,
        collected: false,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    // 5. Natural Coin Arcs on crests
    if (Math.random() < 0.6) {
      const arcStartX = startX + 150;
      const arcEndX = arcStartX + 280;
      const h1 = this.getHeightAndSlopeAt(arcStartX);
      const h2 = this.getHeightAndSlopeAt(arcEndX);
      this.spawnCoinArc(arcStartX, h1.y - 25, arcEndX, h2.y - 25, 5, -80);
    }

    // 6. Desert Scenery (Temple Pillars, Archways, Date Palms, Ancient Pots)
    this.spawnSceneryInSegment(startX, endX, biomeId);
  }

  spawnCoinArc(x1, y1, x2, y2, count, arcHeight) {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = x1 + (x2 - x1) * t;
      const linearY = y1 + (y2 - y1) * t;
      // Parabolic jump arc
      const parabolicOffset = 4 * arcHeight * t * (1 - t);
      this.coins.push({
        x: x,
        y: linearY + parabolicOffset,
        collected: false
      });
    }
  }

  spawnSceneryInSegment(startX, endX, biomeId) {
    const scCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < scCount; i++) {
      const scX = startX + Math.random() * (endX - startX);
      const ground = this.getHeightAndSlopeAt(scX);
      const types = ['temple_column', 'archway', 'palm_tree', 'ancient_urn', 'ship_ribs'];
      const scType = types[Math.floor(Math.random() * types.length)];

      this.scenery.push({
        x: scX,
        y: ground.y,
        angle: ground.angle,
        type: scType,
        scale: 0.8 + Math.random() * 0.4
      });
    }
  }

  // Cleanup old passed entities to keep memory optimal
  cullOldEntities(playerX) {
    const cullBoundary = playerX - 1200;

    // Keep control points that are near player
    while (this.controlPoints.length > 5 && this.controlPoints[2].x < cullBoundary) {
      this.controlPoints.shift();
    }

    this.grindRopes = this.grindRopes.filter(r => r.x2 > cullBoundary);
    this.balloons = this.balloons.filter(b => b.x > cullBoundary);
    this.rocks = this.rocks.filter(r => r.x > cullBoundary && !r.destroyed);
    this.coins = this.coins.filter(c => c.x > cullBoundary && !c.collected);
    this.powerups = this.powerups.filter(p => p.x > cullBoundary && !p.collected);
    this.scenery = this.scenery.filter(s => s.x > cullBoundary);
    this.chasms = this.chasms.filter(c => c.x2 > cullBoundary);
  }

  update(playerX, biomeId, time) {
    // Generate ahead if player is within 2500px of end
    if (this.generatedUpToX - playerX < 3000) {
      this.generateAhead(playerX + 4500, biomeId);
    }

    // Gentle floating motion for balloons
    for (const b of this.balloons) {
      b.y = b.baseY + Math.sin(time * 0.002 + b.floatOffset) * 14;
    }

    // Periodic culling
    this.cullOldEntities(playerX);
  }
}
