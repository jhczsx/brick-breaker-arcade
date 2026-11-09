/**
 * Ponto de entrada: conecta o jogo (canvas) à interface (DOM),
 * controla o loop de animação e trata as ações do jogador.
 */

import { Game, State } from './game.js';
import { Input } from './input.js';
import { Sound } from './audio.js';

/* ---------------------------------------------------------------- */
/* Elementos da interface                                            */
/* ---------------------------------------------------------------- */

const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const hudScore = document.getElementById('hud-score');
const hudHighScore = document.getElementById('hud-highscore');
const hudLevel = document.getElementById('hud-level');
const hudLives = document.getElementById('hud-lives');

const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnMute = document.getElementById('btn-mute');
const btnRestart = document.getElementById('btn-restart');

/* ---------------------------------------------------------------- */
/* Componentes do jogo                                               */
/* ---------------------------------------------------------------- */

const sound = new Sound();

const input = new Input(canvas, {
  onAction: (code) => handleAction(code),
});

const game = new Game(canvas, {
  input,
  sound,
  onChange: (snapshot) => render(snapshot),
});

/* ---------------------------------------------------------------- */
/* Ações do jogador                                                  */
/* ---------------------------------------------------------------- */

function handleAction(code) {
  sound.unlock();

  if (code === 'KeyP' || code === 'Escape') {
    game.togglePause();
    return;
  }

  // Espaço ou Enter
  switch (game.state) {
    case State.MENU:
    case State.GAME_OVER:
    case State.VICTORY:
      game.start();
      break;
    case State.LEVEL_CLEAR:
      game.nextLevel();
      break;
    case State.PAUSED:
      game.resume();
      break;
    case State.PLAYING:
      if (game.serving) game.launch();
      break;
    default:
      break;
  }
}

function primaryAction() {
  sound.unlock();

  switch (game.state) {
    case State.MENU:
    case State.GAME_OVER:
    case State.VICTORY:
      game.start();
      break;
    case State.LEVEL_CLEAR:
      game.nextLevel();
      break;
    case State.PAUSED:
      game.resume();
      break;
    case State.PLAYING:
      if (game.serving) game.launch();
      else game.pause();
      break;
    default:
      break;
  }
}

/* ---------------------------------------------------------------- */
/* Interface                                                         */
/* ---------------------------------------------------------------- */

function render(snapshot) {
  hudScore.textContent = snapshot.score;
  hudHighScore.textContent = snapshot.highScore;
  hudLevel.textContent = snapshot.level;

  renderLives(snapshot.lives);
  renderOverlay(snapshot);
  syncButtons(snapshot);
}

function renderLives(lives) {
  const maxLives = 3;
  const parts = [];

  for (let i = 0; i < maxLives; i++) {
    const lost = i >= lives ? ' life--lost' : '';
    parts.push(`<span class="life${lost}"></span>`);
  }

  hudLives.innerHTML = parts.join('');
}

function syncButtons(snapshot) {
  switch (snapshot.state) {
    case State.MENU:
      btnStart.textContent = 'Jogar';
      break;
    case State.PLAYING:
      btnStart.textContent = snapshot.serving ? 'Servir' : 'Pausar';
      break;
    case State.PAUSED:
      btnStart.textContent = 'Continuar';
      break;
    case State.LEVEL_CLEAR:
      btnStart.textContent = 'Próximo nível';
      break;
    default:
      btnStart.textContent = 'Jogar de novo';
      break;
  }

  btnPause.textContent = snapshot.state === State.PAUSED ? 'Continuar' : 'Pausar';
  btnPause.classList.toggle('btn--ghost', snapshot.state !== State.PLAYING && snapshot.state !== State.PAUSED);
}

function scoreBlock(snapshot) {
  return `
    <div class="panel__score">
      <div class="panel__score-item">
        <span class="panel__score-label">Pontos</span>
        <span class="panel__score-value">${snapshot.score}</span>
      </div>
      <div class="panel__score-item">
        <span class="panel__score-label">Recorde</span>
        <span class="panel__score-value">${snapshot.highScore}</span>
      </div>
      <div class="panel__score-item">
        <span class="panel__score-label">Nível</span>
        <span class="panel__score-value">${snapshot.level}</span>
      </div>
    </div>`;
}

function renderOverlay(snapshot) {
  const { state } = snapshot;

  if (state === State.PLAYING && !snapshot.serving) {
    overlay.hidden = true;
    overlay.className = 'overlay';
    overlay.innerHTML = '';
    return;
  }

  overlay.hidden = false;

  switch (state) {
    case State.MENU:
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="panel">
          <h2 class="panel__title">BRICK BREAKER</h2>
          <p class="panel__text">
            Quebre todos os blocos sem deixar a bola cair.<br />
            Cada bloco vale mais pontos quanto mais alto na tela.
          </p>
          <div class="panel__keys">
            <span class="panel__key"><kbd>&larr;</kbd><kbd>&rarr;</kbd> ou <kbd>A</kbd><kbd>D</kbd> mover</span>
            <span class="panel__key">mouse tamb&eacute;m</span>
            <span class="panel__key"><kbd>Espa&ccedil;o</kbd> servir</span>
            <span class="panel__key"><kbd>P</kbd> pausar</span>
          </div>
          <button class="btn btn--primary" data-action="start">Jogar</button>
        </div>`;
      break;

    case State.PLAYING:
      overlay.className = 'overlay overlay--hint';
      overlay.innerHTML = '<p class="hint-text">ESPA&ccedil;O ou clique para servir</p>';
      break;

    case State.PAUSED:
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="panel">
          <h2 class="panel__title">PAUSADO</h2>
          <p class="panel__text">Respire fundo. Os blocos vão estar aqui.</p>
          <button class="btn btn--primary" data-action="resume">Continuar</button>
        </div>`;
      break;

    case State.LEVEL_CLEAR:
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="panel">
          <h2 class="panel__title">N&Iacute;VEL ${snapshot.level} COMPLETO!</h2>
          ${scoreBlock(snapshot)}
          <button class="btn btn--primary" data-action="next">Pr&oacute;ximo n&iacute;vel</button>
        </div>`;
      break;

    case State.GAME_OVER:
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="panel">
          <h2 class="panel__title">FIM DE JOGO</h2>
          ${snapshot.newRecord ? '<span class="panel__record">&#9733; Novo recorde!</span>' : ''}
          ${scoreBlock(snapshot)}
          <button class="btn btn--primary" data-action="start">Jogar de novo</button>
        </div>`;
      break;

    case State.VICTORY:
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <div class="panel">
          <h2 class="panel__title">PARAB&Eacute;NS!</h2>
          <p class="panel__text">Voc&ecirc; zerou todos os n&iacute;veis. &#127881;</p>
          ${snapshot.newRecord ? '<span class="panel__record">&#9733; Novo recorde!</span>' : ''}
          ${scoreBlock(snapshot)}
          <button class="btn btn--primary" data-action="start">Jogar de novo</button>
        </div>`;
      break;

    default:
      break;
  }
}

/* ---------------------------------------------------------------- */
/* Botões                                                            */
/* ---------------------------------------------------------------- */

/**
 * Registra um listener de clique que tira o foco do botão.
 * Sem isso, o <kbd>Espaço</kbd> pressionado com o botão focado dispararia
 * o clique do teclado E o atalho do jogo ao mesmo tempo.
 */
function onClick(element, handler) {
  element.addEventListener('click', (event) => {
    element.blur();
    handler(event);
  });
}

onClick(btnStart, primaryAction);

onClick(btnPause, () => {
  sound.unlock();
  game.togglePause();
});

onClick(btnMute, () => {
  sound.unlock();
  const enabled = sound.toggle();
  btnMute.textContent = enabled ? 'Som: ligado' : 'Som: mudo';
  btnMute.setAttribute('aria-pressed', String(!enabled));
});

onClick(btnRestart, () => {
  sound.unlock();
  game.restart();
});

// Clique no canvas serve a bola (ou avança a partida).
canvas.addEventListener('click', () => {
  sound.unlock();

  if (game.state === State.PLAYING && game.serving) {
    game.launch();
  } else if (game.state === State.MENU) {
    game.start();
  }
});

// Botões dentro do overlay (delegação de eventos).
overlay.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  sound.unlock();
  button.blur();
  const action = button.dataset.action;

  if (action === 'start') game.start();
  else if (action === 'resume') game.resume();
  else if (action === 'next') game.nextLevel();
});

/* ---------------------------------------------------------------- */
/* Loop de animação                                                   */
/* ---------------------------------------------------------------- */

let lastTime = performance.now();

function frame(now) {
  // Limita o delta para 1/30s: evita saltos após a aba ficar em segundo plano.
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  game.update(dt);
  game.draw();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* Pausa automaticamente ao sair da aba. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === State.PLAYING) {
    game.pause();
  }
});

window.addEventListener('blur', () => {
  if (game.state === State.PLAYING) game.pause();
});

/* Sinaliza que os módulos carregaram (ver aviso no index.html). */
window.__brickBreakerBooted = true;

/* Exposto para facilitate a depuração no console do navegador. */
window.brickBreaker = { game, sound, input };
