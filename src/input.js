/**
 * Entrada do jogador: teclado, mouse e toque.
 *
 * O controle por mouse tem prioridade enquanto o ponteiro estiver se movendo;
 * ao usar o teclado, o mouse volta a "poder" até o próximo movimento dele.
 */

export class Input {
  constructor(canvas, { onAction = () => {} } = {}) {
    this.canvas = canvas;
    this.onAction = onAction;
    this.keys = new Set();
    this.pointerTarget = null;
    this.pointerActive = false;
    this.enabled = true;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerdown', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    window.addEventListener('blur', this.handleBlur);
  }

  handleKeyDown(event) {
    if (event.repeat) return;

    const code = event.code;

    if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
      this.keys.add(code);
      this.pointerActive = false; // teclado assume o controle
      event.preventDefault();
      return;
    }

    if (code === 'Space' || code === 'Enter' || code === 'KeyP' || code === 'Escape') {
      event.preventDefault();
      this.onAction(code);
    }
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  handlePointerMove(event) {
    if (!this.enabled) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    // Converte a posição da tela para o espaço interno do canvas (960x640).
    const x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
    this.pointerTarget = x;
    this.pointerActive = true;
  }

  handlePointerLeave() {
    this.pointerActive = false;
    this.pointerTarget = null;
  }

  handleBlur() {
    this.keys.clear();
  }

  get left() {
    return this.keys.has('ArrowLeft') || this.keys.has('KeyA');
  }

  get right() {
    return this.keys.has('ArrowRight') || this.keys.has('KeyD');
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    window.removeEventListener('blur', this.handleBlur);
  }
}
