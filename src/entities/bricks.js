/**
 * Blocos e o campo de blocos (tabuleiro).
 *
 * Cada nível é descrito por linhas de texto:
 *   '1' = bloco normal (1 golpe)
 *   '2' = bloco blindado (2 golpes)
 *   '.' = espaço vazio
 */

export const WALL_THICKNESS = 12;

const PALETTE = [
  '#ff3d81', // magenta
  '#ff6b3d', // laranja
  '#ffb03a', // âmbar
  '#4ade80', // verde
  '#37e6ff', // ciano
  '#7c5cff', // violeta
];

const LEVELS = [
  {
    name: 'Primeira Fileira',
    rows: [
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
      '1111111111',
    ],
  },
  {
    name: 'Corredor',
    rows: [
      '.111111111.',
      '1111111111',
      '1111111111',
      '.111111111.',
      '.111111111.',
    ],
  },
  {
    name: 'Pirâmide',
    rows: [
      '2111111112',
      '2211111122',
      '1111111111',
      '1111111111',
      '.111111111.',
      '..1111111..',
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;

export class Brick {
  constructor({ x, y, width, height, row, col, hp, points, color }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.row = row;
    this.col = col;
    this.hp = hp;
    this.maxHp = hp;
    this.points = points;
    this.color = color;
  }

  get alive() {
    return this.hp > 0;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  /** Aplica um dano. Retorna `true` se o bloco foi destruído. */
  hit() {
    this.hp -= 1;
    return this.hp <= 0;
  }

  draw(ctx) {
    const { x, y, width, height, color } = this;

    ctx.save();

    // Sombra projetada.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 3, width, height, 5);
    ctx.fill();

    // Corpo.
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shade(color, -0.32));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 5);
    ctx.fill();

    // Brilho superior.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 2.5, width - 6, 2.5, 2);
    ctx.fill();

    // Bloco blindado: moldura interna. Já danificado: rachadura.
    if (this.maxHp > 1) {
      ctx.strokeStyle = this.hp === this.maxHp ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = this.hp === this.maxHp ? 2 : 3;
      ctx.beginPath();
      if (this.hp === this.maxHp) {
        ctx.roundRect(x + 5, y + 5, width - 10, height - 10, 3);
      } else {
        ctx.moveTo(x + width * 0.3, y + 3);
        ctx.lineTo(x + width * 0.46, y + height * 0.5);
        ctx.lineTo(x + width * 0.38, y + height - 3);
        ctx.moveTo(x + width * 0.46, y + height * 0.5);
        ctx.lineTo(x + width * 0.66, y + height * 0.45);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

/** Escurece (t < 0) ou clareia (t > 0) uma cor hexadecimal. */
function shade(hex, t) {
  const value = hex.replace('#', '');
  const num = Number.parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const adjust = (c) =>
    Math.max(0, Math.min(255, Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

export class BrickField {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.bricks = [];
    this.levelName = '';
    this.topOffset = 62;
  }

  loadLevel(levelNumber) {
    const definition = LEVELS[Math.min(levelNumber, LEVELS.length) - 1];
    this.levelName = definition.name;
    this.bricks = [];

    const rows = definition.rows;
    const cols = Math.max(...rows.map((row) => row.length));
    const gap = 5;
    const padding = WALL_THICKNESS + 12;
    const available = this.canvasWidth - padding * 2;
    const brickWidth = (available - gap * (cols - 1)) / cols;
    const brickHeight = 28;
    const rowGap = 7;

    rows.forEach((rowText, rowIndex) => {
      for (let col = 0; col < rowText.length; col++) {
        const symbol = rowText[col];
        if (symbol === '.') continue;

        const hp = symbol === '2' ? 2 : 1;
        const x = padding + col * (brickWidth + gap);
        const y = this.topOffset + rowIndex * (brickHeight + rowGap);
        const basePoints = (rows.length - rowIndex) * 10;

        this.bricks.push(
          new Brick({
            x,
            y,
            width: brickWidth,
            height: brickHeight,
            row: rowIndex,
            col,
            hp,
            points: basePoints + (hp > 1 ? 20 : 0),
            color: PALETTE[(rowIndex + 1) % PALETTE.length],
          }),
        );
      }
    });
  }

  get remaining() {
    return this.bricks.reduce((total, brick) => total + (brick.alive ? 1 : 0), 0);
  }

  get total() {
    return this.bricks.length;
  }

  /**
   * Procura colisão entre a bola e os blocos.
   * @returns {{brick: Brick, destroyed: boolean, normal: {x: number, y: number}, penetration: number} | null}
   */
  collide(ball) {
    let best = null;

    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      const hit = circleRectCollision(ball.x, ball.y, ball.radius, brick);
      if (!hit) continue;

      if (!best || hit.penetration > best.penetration) {
        best = { brick, normal: hit, penetration: hit.penetration };
      }
    }

    if (!best) return null;

    const destroyed = best.brick.hit();
    return { ...best, destroyed };
  }

  draw(ctx) {
    for (const brick of this.bricks) {
      if (brick.alive) brick.draw(ctx);
    }
  }
}

/**
 * Colisão entre um círculo e um retângulo.
 * Retorna a normal (nx, ny) e a penetração, ou null se não houver colisão.
 */
export function circleRectCollision(cx, cy, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > radius * radius) return null;

  if (distanceSquared > 0.000001) {
    const distance = Math.sqrt(distanceSquared);
    return { x: dx / distance, y: dy / distance, penetration: radius - distance };
  }

  // O centro está dentro do retângulo: sai pelo lado de menor penetração.
  const left = cx - rect.x;
  const right = rect.x + rect.width - cx;
  const top = cy - rect.y;
  const bottom = rect.y + rect.height - cy;
  const min = Math.min(left, right, top, bottom);

  if (min === left) return { x: -1, y: 0, penetration: radius + left };
  if (min === right) return { x: 1, y: 0, penetration: radius + right };
  if (min === top) return { x: 0, y: -1, penetration: radius + top };
  return { x: 0, y: 1, penetration: radius + bottom };
}
