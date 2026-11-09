/**
 * Armazenamento local (recorde do jogador).
 * Todo acesso é protegido: em modo privado do navegador o localStorage
 * pode lançar exceção, e o jogo precisa continuar funcionando.
 */

const HIGH_SCORE_KEY = 'brick-breaker:highscore';

export const Storage = {
  getHighScore() {
    try {
      const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
      const value = Number.parseInt(raw ?? '', 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  },

  setHighScore(score) {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      /* sem persistência — não é motivo para travar o jogo */
    }
  },
};
