import { SaveManager } from './SaveManager.js';
import { InputManager } from './InputManager.js';
import { RunnerController } from './RunnerController.js';
import { TrackManager } from './TrackManager.js';
import { ParticleManager } from './ParticleManager.js';
import { AudioManager } from './AudioManager.js';
import { UIManager } from './UIManager.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.save = new SaveManager();
    this.input = new InputManager(canvas);
    this.runner = new RunnerController();
    this.track = new TrackManager();
    this.particles = new ParticleManager();
    this.audio = new AudioManager(this.save.data.sound);
    this.ui = new UIManager(this);
    this.state = 'menu';
    this.last = 0;
    this.dpr = 1;
    this.cameraShake = 0;
    this.slowMo = 0;
    this.transition = 0;
    this.fireflies = Array.from({ length: 44 }, (_, i) => ({ x: Math.random(), y: Math.random() * 0.65, phase: i * 1.71, speed: 0.3 + Math.random() * 0.5 }));
    this.boundFrame = (time) => this.frame(time);
  }

  boot() {
    this.resize();
    this.input.bind();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'running') this.pause();
    });
    this.ui.setSettings(this.save.data);
    this.ui.show('menu');
    requestAnimationFrame(this.boundFrame);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  resetRun() {
    this.runner.reset();
    this.track.reset();
    this.particles.clear();
    Object.assign(this, {
      distance: 0, elapsed: 0, score: 0, shards: 0, sigils: 0,
      multiplier: 1, streak: 0, smashStreak: 0, transformations: 0,
      speed: 17.5, targetSpeed: 17.5, shield: false, magnetTimer: 0,
      multiplierTimer: 0, lionTimer: 0, lionDuration: 10, lionActive: false,
      invulnerable: 0, cameraShake: 0, slowMo: 0, transition: 0,
      activePower: null, lastInteraction: 0
    });
  }

  startRun() {
    this.audio.ensureStarted();
    this.audio.setPaused(false);
    this.audio.setLion(false);
    this.resetRun();
    this.state = 'running';
    this.ui.show('running');
    this.last = performance.now();
  }

  showMenu() {
    this.state = 'menu';
    this.audio.setPaused(true);
    this.audio.setLion(false);
    this.ui.setSettings(this.save.data);
    this.ui.show('menu');
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.audio.setPaused(true);
    this.ui.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.last = performance.now();
    this.audio.setPaused(false);
    this.ui.show('running');
  }

  toggleSound() {
    const enabled = !this.save.data.sound;
    this.save.setSetting('sound', enabled);
    this.audio.setEnabled(enabled);
    this.ui.setSettings(this.save.data);
  }

  toggleHaptics() {
    this.save.setSetting('haptics', !this.save.data.haptics);
    this.ui.setSettings(this.save.data);
  }

  vibrate(pattern) {
    if (this.save.data.haptics) navigator.vibrate?.(pattern);
  }

  frame(time) {
    const rawDt = Math.min(0.05, Math.max(0, (time - this.last) / 1000 || 0));
    this.last = time;
    const dt = rawDt * (this.slowMo > 0 ? 0.28 : 1);
    if (this.slowMo > 0) this.slowMo -= rawDt;
    this.processInput();
    if (this.state === 'running') this.update(dt, rawDt);
    else this.updateAmbient(rawDt);
    this.render(time / 1000);
    requestAnimationFrame(this.boundFrame);
  }

  processInput() {
    for (const { action } of this.input.drain()) {
      if (action === 'pause') {
        if (this.state === 'running') this.pause(); else if (this.state === 'paused') this.resume();
        continue;
      }
      if (action === 'restart') { this.startRun(); continue; }
      if (this.state === 'menu' && action === 'tap') { this.startRun(); continue; }
      if (this.state !== 'running') continue;
      this.runner.handle(action, this.lionActive);
      if (['left', 'right'].includes(action)) this.audio.play('lane');
      if (action === 'up') this.audio.play('jump');
      if (action === 'down') this.audio.play(this.runner.grounded ? 'slide' : 'slam');
      if (action === 'tap' && this.lionActive) {
        this.audio.play('roar');
        this.cameraShake = Math.max(this.cameraShake, 0.35);
        this.ui.toast('LION POWER', 'orange');
      }
    }
  }

  update(dt, rawDt) {
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.transition = Math.max(0, this.transition - rawDt);
    this.targetSpeed = Math.min(31, 17.5 + this.elapsed * 0.12 + (this.lionActive ? 6 : 0) + (this.runner.powerDash > 0 ? 8 : 0));
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 2.4);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * (4.4 * this.multiplier) + (this.lionActive ? 18 * dt : 0);

    const movement = this.runner.update(dt, this.lionActive);
    if (movement.jumped) this.particles.burst(this.playerX(), this.playerY(), 8, { color: '#7ffcff', speed: 45, life: 0.35, gravity: 20 });
    if (movement.landed) {
      this.audio.play(movement.hard ? 'slam' : 'lane');
      this.cameraShake = Math.max(this.cameraShake, movement.hard ? 0.65 : 0.22);
      this.particles.burst(this.playerX(), this.playerY() + 24, movement.hard ? 24 : 12, { color: movement.hard ? '#b967ff' : '#54e8df', speed: movement.hard ? 130 : 75, life: 0.55, gravity: 130 });
      if (movement.hard) this.ui.toast('GROUND SLAM', 'violet');
    }

    this.track.update(this.distance, this.elapsed);
    this.updatePowerUps(dt);
    this.handleCollisions();
    this.particles.update(dt);
    this.cameraShake = Math.max(0, this.cameraShake - rawDt * 1.7);
    this.audio.update(rawDt, true);
    this.ui.updateHud(this.hudData());
  }

  updateAmbient(dt) {
    this.particles.update(dt);
    this.cameraShake = Math.max(0, this.cameraShake - dt * 2);
  }

  updatePowerUps(dt) {
    this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    this.multiplierTimer = Math.max(0, this.multiplierTimer - dt);
    if (this.multiplierTimer <= 0) this.multiplier = this.lionActive ? 3 : 1;
    if (this.lionActive) {
      this.lionTimer -= dt;
      if (this.lionTimer <= 0) this.endLion();
    }
    if (this.magnetTimer > 0 || this.lionActive) {
      for (const entity of this.track.nearby(this.distance, 38)) {
        if (entity.type !== 'shard') continue;
        const laneDiff = (entity.dynamicLane ?? entity.lane) - this.runner.lane;
        if (Math.abs(laneDiff) < 1.6) entity.magnetized = true;
      }
    }
  }

  handleCollisions() {
    for (const entity of this.track.collisionCandidates(this.distance, 2.3)) {
      const entityLane = entity.dynamicLane ?? entity.lane ?? 0;
      const laneHit = entity.allLanes || Math.abs(entityLane - this.runner.lane) < 0.46 || (entity.magnetized && entity.type === 'shard');
      if (!laneHit) {
        if (!entity.nearMissed && Math.abs(entity.worldZ - this.distance) < 0.45 && Math.abs(entityLane - this.runner.lane) < 0.92 && this.isObstacle(entity)) {
          entity.nearMissed = true;
          this.score += 90 * this.multiplier;
          this.ui.toast('NEAR MISS', 'cyan');
        }
        continue;
      }

      if (entity.type === 'shard') { this.collectShard(entity); continue; }
      if (entity.type === 'sigil') { this.collectSigil(entity); continue; }
      if (['shield', 'magnet', 'multiplier'].includes(entity.type)) { this.collectPower(entity); continue; }
      if (this.isObstacle(entity)) this.hitObstacle(entity);
    }
  }

  isObstacle(entity) {
    return ['rock', 'log', 'lowBranch', 'gap', 'movingPillar', 'rotatingTrap', 'gate', 'crate', 'ruinWall'].includes(entity.type);
  }

  obstacleAvoided(entity) {
    if (entity.type === 'lowBranch') return this.runner.sliding || this.runner.y > 2.8;
    if (entity.type === 'gap') return this.runner.y > 1.2;
    if (entity.type === 'log') return this.runner.y > 1.15;
    if (entity.type === 'rotatingTrap') return this.runner.sliding || this.runner.y > 2.2;
    return this.runner.y > 2.0;
  }

  hitObstacle(entity) {
    if (this.obstacleAvoided(entity)) {
      entity.hit = true;
      this.score += 65 * this.multiplier;
      if (this.runner.y > 1.5) this.ui.toast('PERFECT JUMP', 'cyan');
      return;
    }
    if (this.lionActive && (entity.destructible || entity.type !== 'gap')) {
      this.smash(entity);
      return;
    }
    if (this.shield) {
      this.shield = false;
      this.invulnerable = 1.2;
      entity.active = false;
      this.audio.play('breakShield');
      this.ui.flash('cyan');
      this.ui.toast('SPIRIT SHIELD', 'cyan');
      this.cameraShake = 0.55;
      this.vibrate(35);
      return;
    }
    if (this.invulnerable > 0) return;
    this.gameOver();
  }

  collectShard(entity) {
    entity.active = false;
    this.shards += this.multiplierTimer > 0 ? 2 : 1;
    this.streak += 1;
    this.score += 35 * this.multiplier;
    this.audio.play('shard');
    const pos = this.project(entity);
    this.particles.burst(pos.x, pos.y, 8, { color: '#ffd76a', speed: 70, life: 0.45, gravity: 30, glow: 14 });
    if (this.streak === 10 || (this.streak > 10 && this.streak % 20 === 0)) this.ui.toast(`SHARD STREAK ×${this.streak}`, 'gold');
  }

  collectSigil(entity) {
    entity.active = false;
    this.sigils = Math.min(3, this.sigils + 1);
    this.score += 420;
    this.audio.play('sigil');
    this.ui.flash('gold');
    this.ui.toast(`${this.sigils}/3 LION SIGILS`, 'gold');
    this.vibrate([25, 35, 25]);
    if (this.sigils >= 3) this.awakenLion();
  }

  collectPower(entity) {
    entity.active = false;
    if (entity.type === 'shield') {
      this.shield = true;
      this.audio.play('shield');
      this.ui.toast('SPIRIT SHIELD', 'cyan');
    } else if (entity.type === 'magnet') {
      this.magnetTimer = 8;
      this.audio.play('magnet');
      this.ui.toast('MOON MAGNET', 'violet');
    } else {
      this.multiplierTimer = 10;
      this.multiplier = this.lionActive ? 4 : 2;
      this.audio.play('multiplier');
      this.ui.toast('MOON RUSH ×2', 'gold');
    }
    this.ui.flash(entity.type === 'shield' ? 'cyan' : 'gold');
  }

  awakenLion() {
    if (this.lionActive) return;
    this.lionActive = true;
    this.lionTimer = this.lionDuration;
    this.sigils = 0;
    this.transformations += 1;
    this.multiplier = this.multiplierTimer > 0 ? 4 : 3;
    this.slowMo = 0.72;
    this.transition = 1.35;
    this.invulnerable = 1.5;
    this.cameraShake = 0.75;
    this.audio.play('transform');
    window.setTimeout(() => this.audio.play('roar'), 260);
    this.audio.setLion(true);
    this.ui.flash('gold');
    this.ui.toast('BEAST AWAKENED', 'orange');
    this.vibrate([40, 35, 90]);
    this.particles.burst(this.playerX(), this.playerY(), 52, { color: '#ffad36', speed: 170, life: 1.1, gravity: 45, size: 6, glow: 20 });
  }

  endLion() {
    this.lionActive = false;
    this.lionTimer = 0;
    this.transition = 0.8;
    this.multiplier = this.multiplierTimer > 0 ? 2 : 1;
    this.audio.setLion(false);
    this.audio.play('transform');
    this.ui.toast('ECLIPSE RESTORED', 'violet');
  }

  smash(entity) {
    entity.active = false;
    this.smashStreak += 1;
    this.score += (170 + this.smashStreak * 22) * this.multiplier;
    this.audio.play('smash');
    this.cameraShake = Math.max(this.cameraShake, 0.85);
    this.ui.flash('orange');
    this.ui.toast(`SMASH STREAK ×${this.smashStreak}`, 'orange');
    this.vibrate(45);
    const pos = this.project(entity);
    this.particles.burst(pos.x, pos.y, 30, { color: '#ff9938', speed: 180, life: 0.8, gravity: 190, size: 6, glow: 12 });
  }

  gameOver() {
    this.state = 'gameover';
    this.audio.play('crash');
    this.audio.setPaused(true);
    this.audio.setLion(false);
    this.cameraShake = 1;
    this.vibrate([80, 40, 100]);
    const newHigh = this.save.recordRun({ score: this.score, distance: this.distance, shards: this.shards });
    this.ui.setSettings(this.save.data);
    window.setTimeout(() => this.ui.showResult({
      score: this.score, best: this.save.data.bestScore, distance: this.distance,
      shards: this.shards, transformations: this.transformations
    }, newHigh), 280);
  }

  hudData() {
    let power = null;
    if (this.lionActive) power = { name: 'MAGICAL LION', remaining: this.lionTimer, duration: this.lionDuration };
    else if (this.magnetTimer > 0) power = { name: 'MOON MAGNET', remaining: this.magnetTimer, duration: 8 };
    else if (this.multiplierTimer > 0) power = { name: 'SHARD ×2', remaining: this.multiplierTimer, duration: 10 };
    else if (this.shield) power = { name: 'SPIRIT SHIELD', remaining: 1, duration: 1 };
    return { score: this.score, distance: this.distance, shards: this.shards, sigils: this.sigils, multiplier: this.multiplier, power };
  }

  playerX() {
    const road = Math.min(this.width * 0.34, 185);
    return this.width / 2 + this.runner.lane * road * 0.58;
  }

  playerY() {
    return this.height * 0.82 - this.runner.y * Math.min(13, this.height / 60);
  }

  project(entity) {
    const z = entity.worldZ - (this.distance || 0);
    const maxDepth = 125;
    const depth = clamp(z / maxDepth, 0, 1);
    const near = Math.pow(1 - depth, 1.38);
    const horizon = this.height * 0.235;
    const ground = this.height * 0.91;
    const y = lerp(horizon, ground, near);
    const halfRoad = lerp(this.width * 0.045, Math.min(this.width * 0.43, 230), near);
    const laneValue = entity.dynamicLane ?? entity.lane ?? 0;
    const x = this.width / 2 + laneValue * halfRoad * 0.63;
    const scale = lerp(0.12, 1.18, near);
    return { x, y: y - (entity.height || 0) * 24 * scale, scale, near, z };
  }

  render(time) {
    const ctx = this.ctx;
    const shake = this.cameraShake * 8;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);
    this.drawSky(ctx, time);
    this.drawJungle(ctx, time);
    this.drawTrack(ctx, time);
    const entities = this.track.nearby(this.distance || 0, 128).sort((a, b) => b.worldZ - a.worldZ);
    for (const entity of entities) this.drawEntity(ctx, entity, time);
    this.drawRunner(ctx, time);
    this.particles.draw(ctx);
    this.drawAtmosphere(ctx, time);
    ctx.restore();
  }

  drawSky(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, this.lionActive ? '#160612' : '#030615');
    gradient.addColorStop(0.55, '#07152a');
    gradient.addColorStop(1, '#03100f');
    ctx.fillStyle = gradient;
    ctx.fillRect(-12, -12, this.width + 24, this.height + 24);

    const moonX = this.width * 0.68;
    const moonY = this.height * 0.13;
    const moonR = Math.min(this.width, this.height) * 0.12;
    const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 2.4);
    glow.addColorStop(0, 'rgba(190,220,255,.34)');
    glow.addColorStop(0.25, 'rgba(98,116,210,.15)');
    glow.addColorStop(1, 'rgba(20,20,60,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, this.width, this.height * 0.5);
    ctx.fillStyle = '#dbe7ff'; ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#071020'; ctx.beginPath(); ctx.arc(moonX - moonR * 0.32, moonY - moonR * 0.1, moonR * 0.98, 0, Math.PI * 2); ctx.fill();
  }

  drawJungle(ctx, time) {
    const horizon = this.height * 0.24;
    ctx.fillStyle = '#051817';
    for (let layer = 0; layer < 3; layer += 1) {
      ctx.globalAlpha = 0.52 + layer * 0.16;
      const base = horizon + layer * 24;
      ctx.beginPath(); ctx.moveTo(0, base + 50);
      for (let x = 0; x <= this.width + 40; x += 28) {
        const y = base - (Math.sin(x * 0.041 + layer * 2.3) * 24 + 18 + ((x * 7 + layer * 13) % 44));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(this.width, base + 100); ctx.lineTo(0, base + 100); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const scroll = (this.distance || 0) * 0.8;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 8; i += 1) {
        const depth = ((i * 19 + scroll) % 150) / 150;
        const scale = 0.28 + depth * 1.15;
        const x = side < 0 ? this.width * (0.18 - depth * 0.21) : this.width * (0.82 + depth * 0.21);
        const y = horizon + depth * (this.height * 0.72);
        ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
        ctx.strokeStyle = '#081c19'; ctx.lineWidth = 18; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(side * 8, -40, side * 18, -110); ctx.stroke();
        ctx.fillStyle = i % 2 ? '#0a312b' : '#09251f';
        for (let j = 0; j < 5; j += 1) {
          ctx.beginPath(); ctx.ellipse(side * (8 + j * 5), -84 - j * 9, 24, 10, side * 0.45, 0, Math.PI * 2); ctx.fill();
        }
        if (i % 3 === 0) {
          ctx.fillStyle = '#2de7d0'; ctx.shadowBlur = 14; ctx.shadowColor = '#2de7d0';
          ctx.beginPath(); ctx.arc(side * 15, -38, 3.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  drawTrack(ctx) {
    const horizon = this.height * 0.235;
    const bottom = this.height * 0.94;
    const topHalf = this.width * 0.045;
    const bottomHalf = Math.min(this.width * 0.43, 230);
    const ground = ctx.createLinearGradient(0, horizon, 0, bottom);
    ground.addColorStop(0, '#102529'); ground.addColorStop(0.55, '#10201d'); ground.addColorStop(1, '#182019');
    ctx.fillStyle = ground;
    ctx.beginPath(); ctx.moveTo(this.width / 2 - topHalf, horizon); ctx.lineTo(this.width / 2 + topHalf, horizon); ctx.lineTo(this.width / 2 + bottomHalf, bottom); ctx.lineTo(this.width / 2 - bottomHalf, bottom); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = 'rgba(66,235,214,.28)'; ctx.lineWidth = 2;
    for (const t of [-0.5, 0.5]) {
      ctx.beginPath(); ctx.moveTo(this.width / 2 + t * topHalf * 1.25, horizon); ctx.lineTo(this.width / 2 + t * bottomHalf * 1.25, bottom); ctx.stroke();
    }

    for (let i = 0; i < 14; i += 1) {
      const phase = ((i / 14 + ((this.distance || 0) % 18) / 18) % 1);
      const p = Math.pow(phase, 1.65);
      const y = lerp(horizon, bottom, p);
      const half = lerp(topHalf, bottomHalf, p);
      ctx.strokeStyle = `rgba(122,93,167,${0.08 + p * 0.13})`;
      ctx.lineWidth = 1 + p * 2;
      ctx.beginPath(); ctx.moveTo(this.width / 2 - half, y); ctx.lineTo(this.width / 2 + half, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(40,222,199,.16)'; ctx.lineWidth = 8; ctx.shadowBlur = 18; ctx.shadowColor = '#25dcc6';
    ctx.beginPath(); ctx.moveTo(this.width / 2 - topHalf, horizon); ctx.lineTo(this.width / 2 - bottomHalf, bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.width / 2 + topHalf, horizon); ctx.lineTo(this.width / 2 + bottomHalf, bottom); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawEntity(ctx, entity, time) {
    const p = this.project(entity);
    if (p.z < -5 || p.z > 130) return;
    const s = p.scale;
    ctx.save(); ctx.translate(p.x, p.y);
    if (entity.type === 'shard') {
      const pulse = 1 + Math.sin(time * 7 + entity.worldZ) * 0.11;
      ctx.scale(s * pulse, s * pulse); ctx.rotate(time * 2.5 + entity.worldZ);
      ctx.shadowBlur = 18; ctx.shadowColor = '#ffd95a'; ctx.fillStyle = '#ffe68a';
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(7, 0); ctx.lineTo(0, 13); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff4c1'; ctx.lineWidth = 1.2; ctx.stroke();
    } else if (entity.type === 'sigil') {
      ctx.scale(s, s); ctx.rotate(Math.sin(time * 2) * 0.08);
      ctx.shadowBlur = 24; ctx.shadowColor = '#ffb32e'; ctx.strokeStyle = '#ffca4d'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -18, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(0, -6); ctx.lineTo(10, -24); ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.stroke();
    } else if (['shield', 'magnet', 'multiplier'].includes(entity.type)) {
      const colors = { shield: '#63f4ff', magnet: '#b46cff', multiplier: '#ffd75f' };
      ctx.scale(s, s); ctx.shadowBlur = 24; ctx.shadowColor = colors[entity.type]; ctx.strokeStyle = colors[entity.type]; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -18, 18 + Math.sin(time * 4) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = colors[entity.type]; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center'; ctx.fillText(entity.type === 'shield' ? '◇' : entity.type === 'magnet' ? '∪' : '×2', 0, -12);
    } else {
      this.drawObstacle(ctx, entity, s, time);
    }
    ctx.restore();
  }

  drawObstacle(ctx, entity, s, time) {
    ctx.scale(s, s);
    const type = entity.type;
    if (type === 'gap') {
      ctx.fillStyle = '#00030a'; ctx.shadowBlur = 18; ctx.shadowColor = '#3b1d6c';
      ctx.beginPath(); ctx.ellipse(0, 5, 74, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b4d8e'; ctx.lineWidth = 3; ctx.stroke();
      return;
    }
    if (type === 'lowBranch' || type === 'rotatingTrap') {
      ctx.save(); if (type === 'rotatingTrap') ctx.rotate(time * 2.4);
      ctx.strokeStyle = '#5a321d'; ctx.lineWidth = type === 'lowBranch' ? 16 : 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-42, -35); ctx.lineTo(42, -35); ctx.stroke();
      ctx.strokeStyle = '#c0883d'; ctx.lineWidth = 3;
      for (let i = -3; i <= 3; i += 1) { ctx.beginPath(); ctx.moveTo(i * 12, -42); ctx.lineTo(i * 12 + 7, -25); ctx.stroke(); }
      ctx.restore(); return;
    }
    if (type === 'log') {
      ctx.fillStyle = '#4c2f1f'; ctx.strokeStyle = '#aa7240'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-35, -20, 70, 22, 10); ctx.fill(); ctx.stroke();
      return;
    }
    if (type === 'gate' || type === 'ruinWall') {
      ctx.fillStyle = type === 'gate' ? '#493019' : '#3f4750'; ctx.strokeStyle = '#ff9f32'; ctx.lineWidth = 3;
      ctx.fillRect(-34, -64, 68, 64); ctx.strokeRect(-34, -64, 68, 64);
      ctx.strokeStyle = '#ffbe54'; ctx.beginPath(); ctx.moveTo(-22, -52); ctx.lineTo(0, -18); ctx.lineTo(22, -52); ctx.stroke();
      return;
    }
    if (type === 'crate') {
      ctx.fillStyle = '#68411e'; ctx.strokeStyle = '#d8953e'; ctx.lineWidth = 3; ctx.fillRect(-24, -44, 48, 44); ctx.strokeRect(-24, -44, 48, 44);
      ctx.beginPath(); ctx.moveTo(-20, -40); ctx.lineTo(20, -4); ctx.moveTo(20, -40); ctx.lineTo(-20, -4); ctx.stroke(); return;
    }
    ctx.fillStyle = type === 'movingPillar' ? '#596064' : '#52545b'; ctx.strokeStyle = '#72f2e2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-18, -47); ctx.lineTo(2, -62); ctx.lineTo(27, -39); ctx.lineTo(23, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(112,255,233,.65)'; ctx.beginPath(); ctx.moveTo(-7, -48); ctx.lineTo(4, -29); ctx.lineTo(-2, -12); ctx.stroke();
  }

  drawRunner(ctx, time) {
    const x = this.playerX();
    const y = this.playerY();
    if (this.lionActive) this.drawLion(ctx, x, y, time); else this.drawOrb(ctx, x, y, time);
  }

  drawOrb(ctx, x, y, time) {
    const squash = this.runner.grounded ? 1 - this.runner.landPulse * 0.18 : 1;
    const radius = clamp(this.width * 0.075, 25, 38);
    ctx.save(); ctx.translate(x, y); ctx.rotate(time * 2.2 + this.runner.laneLean); ctx.scale(1 + (1 - squash) * 0.35, squash);
    if (this.shield) {
      ctx.strokeStyle = 'rgba(105,245,255,.8)'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#66f4ff';
      ctx.beginPath(); ctx.arc(0, 0, radius * 1.45 + Math.sin(time * 5) * 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.magnetTimer > 0) {
      ctx.strokeStyle = 'rgba(186,103,255,.65)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(0, 0, radius * (1.5 + i * 0.22) + Math.sin(time * 4 + i) * 4, 0.4, 2.7); ctx.stroke(); }
    }
    const glow = ctx.createRadialGradient(-7, -8, 2, 0, 0, radius * 1.35);
    glow.addColorStop(0, '#f2d5ff'); glow.addColorStop(0.18, '#ad58ff'); glow.addColorStop(0.45, '#39215f'); glow.addColorStop(0.78, '#11131d'); glow.addColorStop(1, '#05070d');
    ctx.fillStyle = glow; ctx.shadowBlur = 28; ctx.shadowColor = '#8a47ff'; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#48f0e2'; ctx.lineWidth = 2.2;
    for (let i = 0; i < 5; i += 1) { ctx.beginPath(); ctx.arc(0, 0, radius * (0.45 + i * 0.09), i * 1.15, i * 1.15 + 0.7); ctx.stroke(); }
    ctx.restore();
    this.particles.trail(x + (Math.random() - 0.5) * 18, y + radius * 0.6, '#8d4cff', 4.5);
  }

  drawLion(ctx, x, y, time) {
    const scale = clamp(this.width / 390, 0.86, 1.15);
    ctx.save(); ctx.translate(x, y + 5); ctx.scale(scale, scale); ctx.rotate(this.runner.laneLean * 0.25);
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 32; ctx.shadowColor = '#ff9f2e';
    const body = ctx.createLinearGradient(-50, 0, 55, 0); body.addColorStop(0, 'rgba(255,116,20,.45)'); body.addColorStop(0.55, '#ffc34f'); body.addColorStop(1, 'rgba(255,239,161,.78)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(4, -17, 47, 26, -0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(43, -37, 22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff7d1f'; ctx.lineWidth = 11; ctx.beginPath(); ctx.arc(42, -37, 31 + Math.sin(time * 9) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff2aa'; ctx.beginPath(); ctx.moveTo(53, -42); ctx.lineTo(72, -36); ctx.lineTo(53, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd55e'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    const stride = Math.sin(time * 18) * 10;
    ctx.beginPath(); ctx.moveTo(-25, -3); ctx.lineTo(-31 + stride, 25); ctx.moveTo(25, -1); ctx.lineTo(31 - stride, 25); ctx.stroke();
    ctx.strokeStyle = '#ff8e25'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-42, -25); ctx.quadraticCurveTo(-75, -42, -66, -65); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i += 1) this.particles.trail(x - 42 - i * 10, y - 5 + i * 8, i ? '#ff8b25' : '#ffe080', 7);
  }

  drawAtmosphere(ctx, time) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fireflies) {
      const x = (f.x * this.width + Math.sin(time * f.speed + f.phase) * 18 + (this.distance || 0) * 0.08) % this.width;
      const y = f.y * this.height + Math.cos(time * 0.7 + f.phase) * 10;
      const a = 0.25 + (Math.sin(time * 2 + f.phase) + 1) * 0.2;
      ctx.fillStyle = `rgba(84,255,211,${a})`; ctx.shadowBlur = 10; ctx.shadowColor = '#49ffd1';
      ctx.beginPath(); ctx.arc(x, y, 1.2 + a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    const fog = ctx.createLinearGradient(0, this.height * 0.4, 0, this.height);
    fog.addColorStop(0, 'rgba(32,65,76,0)'); fog.addColorStop(0.75, 'rgba(34,76,70,.08)'); fog.addColorStop(1, 'rgba(7,21,20,.34)');
    ctx.fillStyle = fog; ctx.fillRect(0, 0, this.width, this.height);

    const speedAlpha = clamp((this.speed - 20) / 18, 0, 0.45);
    if (speedAlpha > 0) {
      ctx.strokeStyle = `rgba(127,237,255,${speedAlpha})`; ctx.lineWidth = 1.5;
      for (let i = 0; i < 18; i += 1) {
        const x = ((i * 73 + time * this.speed * 22) % (this.width + 100)) - 50;
        const y = (i * 97) % this.height;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 16, y + 52); ctx.stroke();
      }
    }

    if (this.transition > 0) {
      ctx.fillStyle = `rgba(255,143,32,${Math.min(0.3, this.transition * 0.22)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
