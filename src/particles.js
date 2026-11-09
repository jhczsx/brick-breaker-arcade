/**
 * Sistema de partículas simples (explosão de blocos).
 * Cada partícula tem posição, velocidade, cor e tempo de vida.
 */

const GRAVITY = 420;

export class ParticleSystem {
  constructor(limit = 400) {
    this.particles = [];
    this.limit = limit;
  }

  /** Explosão radial a partir de um ponto. */
  burst(x, y, color, amount = 14, spread = 220) {
    for (let i = 0; i < amount; i++) {
      if (this.particles.length >= this.limit) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = spread * (0.35 + Math.random() * 0.85);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 2 + Math.random() * 3.5,
        color,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.85,
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.99;
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
  }
}
