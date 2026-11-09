/**
 * Brick Breaker — núcleo do jogo.
 *
 * Responsável pelas regras, pelo loop de atualização e pelo desenho.
 * A interface (DOM) fica em `main.js` e reage através do callback `onChange`.
 */

import { Paddle } from './entities/paddle.js';
import { Ball } from './entities/ball.js';
import { BrickField, WALL_THICKNESS, LEVEL_COUNT } from './entities/bricks.js';
import { ParticleSystem } from './particles.js';
import { Storage } from './storage.js';

export const State = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_CLEAR: 'level-clear',
  GAME_OVER: 'game-over',
  VICTORY: 'victory',
});

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;

const PADDLE_WIDTH = 132;
const PADDLE_HEIGHT = 18;
const BALL_RADIUS = 9;

const BASE_SPEED = 330;
const MAX_SPEED = 700;
const SPEED_PER_HIT = 5;

const START_LIVES = 3;

/** Ângulo máximo em relação ao "para cima" quando a bola bate no paddle. */
const MAX_BOUNCE_ANGLE = 1.05; // ~60 graus

/** Fração mínima da velocidade que precisa ser vertical (evita trajetórias deitadas). */
const MIN_VERTICAL_FRACTION = 0.3;

/** Distância máxima por sub-passo da física (anti-tunneling). */
const MAX_STEP = 6;

export class Game {
  constructor(canvas, { input, sound, onChange = () => {} } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.sound = sound;
    this.onChange = onChange;

    this.state = State.MENU;
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.highScore = Storage.getHighScore();
    this.newRecord = false;
    this.serving = true;
    this.banner = null;

    this.paddle = new Paddle(PADDLE_WIDTH, PADDLE_HEIGHT, 760);
    this.ball = new Ball(BALL_RADIUS);
    this.bricks = new BrickField(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.particles = new ParticleSystem();

    this.bricks.loadLevel(this.level);
    this.paddle.reset(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ball.attachTo(this.paddle);

    this.emit();
  }

  /* ----------------------------------------------------------------- */
  /* Transições de estado                                               */
  /* ----------------------------------------------------------------- */

  start() {
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.newRecord = false;
    this.particles.clear();
    this.bricks.loadLevel(this.level);
    this.paddle.reset(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.serve();
    this.state = State.PLAYING;
    this.showBanner(`NÍVEL 1 — ${this.bricks.levelName}`);
    this.emit();
  }

  restart() {
    this.start();
  }

  serve() {
    this.serving = true;
    this.ball.attachTo(this.paddle);
  }

  /** Lança a bola (chamado por Espaço, clique ou botão). */
  launch() {
    if (this.state !== State.PLAYING || !this.serving) return false;

    this.serving = false;
    // Sempre para cima (em canvas, Y cresce para baixo: -PI/2 = pra cima),
    // com um desvio aleatório para os lados.
    const angle = -Math.PI / 2 + (Math.random() * 0.9 - 0.45);
    this.ball.launch(BASE_SPEED, angle);
    this.sound.serve();
    this.emit();
    return true;
  }

  pause() {
    if (this.state !== State.PLAYING) return;
    this.state = State.PAUSED;
    this.emit();
  }

  resume() {
    if (this.state !== State.PAUSED) return;
    this.state = State.PLAYING;
    this.emit();
  }

  togglePause() {
    if (this.state === State.PLAYING) this.pause();
    else if (this.state === State.PAUSED) this.resume();
  }

  nextLevel() {
    if (this.level >= LEVEL_COUNT) {
      this.finish(true);
      return;
    }

    this.level += 1;
    this.bricks.loadLevel(this.level);
    this.serve();
    this.state = State.PLAYING;
    this.showBanner(`NÍVEL ${this.level} — ${this.bricks.levelName}`);
    this.emit();
  }

  /** Encerra a partida (derrota ou vitória) e registra o recorde. */
  finish(won = false) {
    this.state = won ? State.VICTORY : State.GAME_OVER;
    this.saveRecord();
    this.sound.gameOver();
    this.emit();
  }

  saveRecord() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      Storage.setHighScore(this.highScore);
      this.newRecord = true;
    } else {
      this.newRecord = false;
    }
  }

  showBanner(text) {
    this.banner = { text, time: 1.9 };
  }

  /* ----------------------------------------------------------------- */
  /* Atualização                                                         */
  /* ----------------------------------------------------------------- */

  update(dt) {
    if (this.banner) {
      this.banner.time -= dt;
      if (this.banner.time <= 0) this.banner = null;
    }

    if (this.state !== State.PLAYING) return;

    this.paddle.update(dt, CANVAS_WIDTH, this.input);
    this.particles.update(dt);

    if (this.serving) {
      this.ball.attachTo(this.paddle);
      return;
    }

    // Passos pequenos evitam que a bola "atravesse" blocos em alta velocidade.
    const distance = this.ball.speed * dt;
    const steps = Math.max(1, Math.ceil(distance / MAX_STEP));
    const stepDt = dt / steps;

    for (let i = 0; i < steps; i++) {
      this.ball.x += this.ball.vx * stepDt;
      this.ball.y += this.ball.vy * stepDt;

      if (this.handleWallCollision()) {
        this.sound.bounce(0.35);
      }

      if (this.handlePaddleCollision()) {
        this.sound.bounce(0.75);
      }

      const hit = this.bricks.collide(this.ball);
      if (hit) {
        this.handleBrickCollision(hit);
      }

      if (this.ball.y - this.ball.radius > CANVAS_HEIGHT) {
        this.loseLife();
        return;
      }
    }
  }

  handleWallCollision() {
    const ball = this.ball;
    let collided = false;

    if (ball.x - ball.radius < WALL_THICKNESS) {
      ball.x = WALL_THICKNESS + ball.radius;
      ball.vx = Math.abs(ball.vx);
      collided = true;
    } else if (ball.x + ball.radius > CANVAS_WIDTH - WALL_THICKNESS) {
      ball.x = CANVAS_WIDTH - WALL_THICKNESS - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      collided = true;
    }

    if (ball.y - ball.radius < WALL_THICKNESS) {
      ball.y = WALL_THICKNESS + ball.radius;
      ball.vy = Math.abs(ball.vy);
      collided = true;
    }

    return collided;
  }

  handlePaddleCollision() {
    const ball = this.ball;
    const paddle = this.paddle;

    if (ball.vy <= 0) return false;
    if (ball.y + ball.radius < paddle.top || ball.y - ball.radius > paddle.bottom) return false;
    if (ball.x + ball.radius < paddle.left || ball.x - ball.radius > paddle.right) return false;

    // Posição do impacto define o ângulo de saída: -1 (borda esquerda) .. 1 (borda direita).
    const offset = clamp((ball.x - paddle.centerX) / (paddle.width / 2), -1, 1);
    const speed = Math.min(MAX_SPEED, ball.speed + SPEED_PER_HIT);
    const angle = offset * MAX_BOUNCE_ANGLE;

    ball.y = paddle.top - ball.radius - 0.5;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;

    return true;
  }

  handleBrickCollision(hit) {
    const ball = this.ball;
    const { brick, normal, destroyed } = hit;

    // Empurra a bola para fora do bloco antes de rebater.
    ball.x += normal.x * normal.penetration;
    ball.y += normal.y * normal.penetration;

    // Rebate no eixo dominante — comportamento clássico de fliperama.
    if (Math.abs(normal.x) > Math.abs(normal.y)) {
      ball.vx = -ball.vx;
    } else {
      ball.vy = -ball.vy;
    }
    this.limitAngle(ball);

    if (destroyed) {
      this.score += brick.points;
      this.particles.burst(brick.centerX, brick.centerY, brick.color, 16);
      this.sound.brickBreak();
    } else {
      this.sound.brickHit();
    }

    this.emit();

    if (this.bricks.remaining === 0) {
      this.state = State.LEVEL_CLEAR;
      this.sound.levelClear();
      this.emit();
    }
  }

  /** Impede trajetórias quase horizontais, que travam o jogo. */
  limitAngle(ball) {
    const speed = ball.speed;
    if (speed === 0) return;

    const minVertical = speed * MIN_VERTICAL_FRACTION;
    if (Math.abs(ball.vy) >= minVertical) return;

    const signY = ball.vy === 0 ? 1 : Math.sign(ball.vy);
    const signX = ball.vx === 0 ? 1 : Math.sign(ball.vx);
    const vy = signY * minVertical;
    const horizontal = Math.sqrt(Math.max(0, speed * speed - vy * vy));

    ball.vy = vy;
    ball.vx = signX * horizontal;
  }

  loseLife() {
    this.lives -= 1;
    this.sound.loseLife();
    this.particles.burst(this.ball.x, CANVAS_HEIGHT - 8, '#ff3d81', 22, 260);

    if (this.lives <= 0) {
      this.finish(false);
      return;
    }

    this.serve();
    this.emit();
  }

  /* ----------------------------------------------------------------- */
  /* Desenho                                                             */
  /* ----------------------------------------------------------------- */

  draw() {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawBackground(ctx);
    this.drawWalls(ctx);
    this.bricks.draw(ctx);
    this.particles.draw(ctx);
    this.paddle.draw(ctx);
    this.ball.draw(ctx);
    this.drawBanner(ctx);
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0d0d1c');
    gradient.addColorStop(1, '#080810');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grade sutil ao fundo.
    ctx.strokeStyle = 'rgba(120, 140, 220, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();
  }

  drawWalls(ctx) {
    ctx.save();
    ctx.fillStyle = '#20203a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, WALL_THICKNESS);
    ctx.fillRect(0, 0, WALL_THICKNESS, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, CANVAS_HEIGHT);

    ctx.shadowColor = 'rgba(124, 92, 255, 0.55)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#7c5cff';
    ctx.fillRect(0, WALL_THICKNESS - 3, CANVAS_WIDTH, 3);
    ctx.fillRect(WALL_THICKNESS - 3, 0, 3, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - WALL_THICKNESS, 0, 3, CANVAS_HEIGHT);
    ctx.restore();
  }

  drawBanner(ctx) {
    if (!this.banner) return;

    const alpha = Math.min(1, this.banner.time / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(5, 5, 12, 0.55)';
    ctx.fillText(this.banner.text, CANVAS_WIDTH / 2 + 3, CANVAS_HEIGHT / 2 + 3);
    ctx.fillStyle = '#e8e8f5';
    ctx.fillText(this.banner.text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.restore();
  }

  /* ----------------------------------------------------------------- */

  emit() {
    this.onChange({
      state: this.state,
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      levelName: this.bricks.levelName,
      newRecord: this.newRecord,
      serving: this.serving,
      remaining: this.bricks.remaining,
      total: this.bricks.total,
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
