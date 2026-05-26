import './styles.css';
import { Game } from './game/Game.js';

const canvas = document.querySelector('#gameCanvas');
const game = new Game(canvas);
game.start();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
