import './styles/main.css';
import { Game } from './game/Game.js';

const canvas = document.querySelector('#game-canvas');
const game = new Game(canvas);
game.boot();

window.__ECLIPSE_BEAST_RUN__ = game;
