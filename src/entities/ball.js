/**
 * A bola.
 *
 * A velocidade é guardada como vetor (vx, vy) para facilitar os rebotes,
 * mas o ângulo é recalculado a partir do ponto de impacto com o paddle,
 * o que dá aquele controle clássico: bater na borda da raquete joga a bola
 * para fora, bater no centro manda a bola para cima.
 */

export class Ball {
  constructor(radius) {
    this.radius = radius;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.stuck = true;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  setSpeed(speed) {
    const current = this.speed;
    if (current === 0) {
      this.vx = 0;
      this.vy = speed;
      return;
    }
    const factor = speed / current;
    this.vx *= factor;
    this.vy *= factor;
  }

  /** Cola a bola no paddle enquanto o jogador se posiciona para o saque. */
  attachTo(paddle, offsetY = 0) {
    this.stuck = true;
    this.x = paddle.centerX;
    this.y = paddle.top - this.radius - 2 - offsetY;
    this.vx = 0;
    this.vy = 0;
  }

  /** Lança a bola com uma velocidade e um ângulo dados. */
  launch(speed, angle) {
    this.stuck = false;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  draw(ctx) {
    ctx.save();

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.35,
      this.y - this.radius * 0.35,
      this.radius * 0.15,
      this.x,
      this.y,
      this.radius,
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.45, '#ffe89a');
    gradient.addColorStop(1, '#ff9c3a');

    ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
