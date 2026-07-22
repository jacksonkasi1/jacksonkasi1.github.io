const MAX = 240;

export class ParticleManager {
  constructor() {
    this.items = Array.from({ length: MAX }, () => ({ active: false }));
  }

  burst(x, y, count, options = {}) {
    let spawned = 0;
    for (const particle of this.items) {
      if (particle.active) continue;
      const angle = (Math.PI * 2 * spawned) / count + Math.random() * 0.7;
      const speed = (options.speed || 90) * (0.55 + Math.random());
      Object.assign(particle, {
        active: true, x, y,
        vx: Math.cos(angle) * speed + (options.vx || 0),
        vy: Math.sin(angle) * speed + (options.vy || 0),
        life: options.life || 0.6,
        maxLife: options.life || 0.6,
        size: (options.size || 4) * (0.6 + Math.random()),
        color: options.color || '#ffe28a',
        gravity: options.gravity ?? 90,
        glow: options.glow ?? 10
      });
      spawned += 1;
      if (spawned >= count) break;
    }
  }

  trail(x, y, color, size = 5) {
    this.burst(x, y, 1, { color, size, speed: 18, life: 0.35, vx: -25, gravity: 0, glow: 14 });
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.shadowBlur = p.glow;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.55 + p.life / p.maxLife * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() { this.items.forEach((p) => { p.active = false; }); }
}
