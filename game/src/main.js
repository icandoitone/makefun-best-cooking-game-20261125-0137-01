// Warung Rush — boot and main loop.
// Loads the kitchen, wires keyboard + mouse, and runs the game at the
// display's refresh rate. A `?shot=` URL parameter stages a mid-game scene
// (cover, chop, serve, rush) so the game's own code can be photographed
// mid-service; without it the game opens on its title screen.

import { newGame, tick, startGame, nextDay, stationById, spawnOrder } from './kitchen.js';
import { createPlayer, bindInput, updateChef, useStation, clickStation, binCarried } from './player.js';
import { createSfx } from './audio.js';
import { draw } from './render.js';
import { INGREDIENTS } from './recipes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = newGame();
const player = createPlayer();
const sfx = createSfx();
player.sfx = sfx;

let paused = false;

// Stage a busy mid-service moment for a screenshot. These are real game
// states — orders on the board, food on the burners, a plate mid-assembly —
// built with the same state the game itself produces while playing.
function stageShot(kind) {
  startGame(game);
  const board = stationById(game, 'board');
  const stove = stationById(game, 'stove');
  const plates = stationById(game, 'plates');
  const put = (id, prep) => ({ kind: 'ingredient', id, prepped: prep });
  if (kind === 'cover') {
    // Three orders waiting, rice frying, chilli chopped, a plate half-built.
    game.chef.x = 700; game.chef.y = 420;
    stove.burners[0] = { item: 'rice', progress: 0.55, burnt: false, doneAt: 0 };
    stove.burners[1] = { item: 'chicken', progress: 0.8, burnt: false, doneAt: 0 };
    board.item = 'chilli'; board.progress = 1;
    plates.plate = { kind: 'plate', items: ['rice'] };
    game.carry = { kind: 'ingredient', id: 'egg', prepped: true };
    game.shiftLeft = 118;
    game.coins = 64; game.score = 640; game.combo = 2;
    while (game.orders.length < 3) spawnOrder(game);
  } else if (kind === 'chop') {
    game.chef.x = 425; game.chef.y = 400;
    board.item = 'veg'; board.progress = 0.45;
    stove.burners[0] = { item: 'noodle', progress: 0.35, burnt: false, doneAt: 0 };
    game.carry = { kind: 'ingredient', id: 'chilli', prepped: false };
    game.shiftLeft = 132;
    game.coins = 22; game.score = 220;
    while (game.orders.length < 2) spawnOrder(game);
  } else if (kind === 'serve') {
    game.chef.x = 1050; game.chef.y = 520;
    plates.plate = { kind: 'plate', items: ['rice', 'egg', 'chilli'] };
    game.carry = { kind: 'plate', items: ['rice', 'egg', 'chilli'] };
    game.shiftLeft = 96;
    game.coins = 118; game.score = 1180; game.combo = 4;
    game.orders[0].recipeId = 'nasi-goreng';
    while (game.orders.length < 3) spawnOrder(game);
  } else if (kind === 'rush') {
    game.chef.x = 640; game.chef.y = 430;
    stove.burners[0] = { item: 'noodle', progress: 0.9, burnt: false, doneAt: 0 };
    stove.burners[1] = { item: 'egg', progress: 0.5, burnt: false, doneAt: 0 };
    board.item = 'chilli'; board.progress = 0.7;
    game.carry = put('veg', true);
    game.shiftLeft = 41;
    game.coins = 210; game.score = 2100; game.combo = 5;
    game.orders.forEach((o) => { o.patience = Math.min(o.patience, 14); });
    while (game.orders.length < 4) spawnOrder(game);
    game.orders.forEach((o) => { o.patience = Math.min(o.patience, 16); });
  }
  game.time = 12;
}

const actions = {
  use() {
    if (game.phase === 'playing' && !paused) useStation(game, sfx);
  },
  bin() { binCarried(game, sfx); },
  pause() {
    if (game.phase === 'playing') { paused = !paused; }
  },
  mute() {
    const muted = sfx.toggleMute();
    game.message = muted ? 'Sound off (M to turn back on)' : 'Sound on';
    game.messageLife = 1.5;
  },
  confirm() {
    if (game.phase === 'title') { startGame(game); sfx.ready(); }
    else if (game.phase === 'dayEnd') { nextDay(game); sfx.ready(); }
  },
  restart() {
    if (game.phase === 'over') { startGame(game); sfx.ready(); }
  },
  click(x, y) {
    if (game.phase === 'title') { startGame(game); sfx.ready(); return; }
    if (game.phase === 'dayEnd') { nextDay(game); sfx.ready(); return; }
    if (game.phase === 'over') { startGame(game); sfx.ready(); return; }
    if (!paused) clickStation(game, x, y);
  },
};

bindInput(canvas, player, game, sfx, actions);

// Expose a tiny handle for automated play-testing in a headless browser.
window.__warung = { game, startGame, actions, useStation };

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(shot);
} else if (params.get('demo') === '1') {
  stageShot('cover');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) {
    updateChef(game, player, dt);
    tick(game, dt, sfx);
  }
  draw(ctx, game);
  if (paused && game.phase === 'playing') {
    ctx.fillStyle = 'rgba(20,10,4,.55)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#fff3dd';
    ctx.font = 'bold 40px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⏸ PAUSED — press P to cook on', 640, 360);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
