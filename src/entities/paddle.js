/**
 * O paddle (a "raquete" do jogador).
 * Aceita controle por teclado ou por mouse/ponteiro, com aceleração suave
 * para não parecer "travado" nas bordas.
 */

export class Paddle {
  constructor(width, height, speed) {
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.x = 0;
    this.y = 0;
    this.velocity = 0;
  }

  reset(canvasWidth, canvasHeight) {
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - 58;
    this.velocity = 0;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  /**
   * @param {number} dt          delta time em segundos
   * @param {number} canvasWidth
   * @param {Input} input
   */
  update(dt, canvasWidth, input) {
    const half = this.width / 2;
    let direction = 0;

    if (input.left) direction -= 1;
    if (input.right) direction += 1;

    if (direction !== 0) {
      this.velocity += direction * this.speed * 12 * dt;
      this.velocity = Math.max(-this.speed, Math.min(this.speed, this.velocity));
    } else {
      // Atrito: desacelera até parar.
      this.velocity *= Math.pow(0.0008, dt);
      if (Math.abs(this.velocity) < 4) this.velocity = 0;
    }

    this.x += this.velocity * dt;

    // Controle por mouse: persegue o ponteiro com velocidade limitada.
    if (input.pointerActive && input.pointerTarget !== null) {
      const target = input.pointerTarget - half;
      const delta = target - this.x;
      const maxStep = this.speed * 1.35 * dt;
      if (Math.abs(delta) <= maxStep) {
        this.x = target;
        this.velocity = 0;
      } else {
        this.x += Math.sign(delta) * maxStep;
        this.velocity = Math.sign(delta) * this.speed;
      }
    }

    // Limites laterais.
    if (this.x < 0) {
      this.x = 0;
      this.velocity = 0;
    }
    if (this.x + this.width > canvasWidth) {
      this.x = canvasWidth - this.width;
      this.velocity = 0;
    }
  }

  draw(ctx) {
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.bottom);
    gradient.addColorStop(0, '#6ef0ff');
    gradient.addColorStop(0.5, '#37e6ff');
    gradient.addColorStop(1, '#1d8ea8');

    ctx.save();
    ctx.shadowColor = 'rgba(55, 230, 255, 0.75)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = gradient;

    const radius = this.height / 2;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fill();
    ctx.restore();

    // Reflexo superior para dar volume.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.roundRect(this.x + 6, this.y + 3, this.width - 12, 3, 2);
    ctx.fill();
  }
}
