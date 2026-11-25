// Warung Rush — the chef: walking, click-to-go, and using stations.
// The chef walks the floor with WASD or the arrow keys. Clicking a station
// walks the chef to its front and uses it on arrival. E or Space uses the
// nearest station right where the chef stands.

import { nearestStation, interact, plateAtCounter, stationById } from './kitchen.js';

const SPEED = 300; // px per second
// The walkable floor: from just below the pantry bins down to the bottom
// counter row, so every station's front edge is reachable on foot.
const FLOOR = { x0: 310, y0: 185, x1: 1250, y1: 700 };

export function createPlayer() {
  return { keys: new Set(), mouse: { x: 0, y: 0, down: false } };
}

export function bindInput(canvas, player, game, sfx, actions) {
  const keymap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };
  window.addEventListener('keydown', (e) => {
    if (keymap[e.code]) { player.keys.add(keymap[e.code]); e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'Space') { actions.use(); e.preventDefault(); }
    if (e.code === 'KeyQ') { actions.bin(); }
    if (e.code === 'KeyP') { actions.pause(); }
    if (e.code === 'KeyM') { actions.mute(); }
    if (e.code === 'Enter' || e.code === 'Space') { actions.confirm(); }
    if (e.code === 'KeyR') { actions.restart(); }
  });
  window.addEventListener('keyup', (e) => {
    if (keymap[e.code]) player.keys.delete(keymap[e.code]);
  });
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    actions.click(x, y);
  });
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    player.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
}

// Walk the chef toward a point; returns true while still travelling.
export function walkTo(game, x, y, dt) {
  const c = game.chef;
  const dx = x - c.x;
  const dy = y - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 6) { c.moving = false; return false; }
  const step = Math.min(d, SPEED * dt);
  c.x += (dx / d) * step;
  c.y += (dy / d) * step;
  c.dir = dx >= 0 ? 1 : -1;
  c.moving = true;
  c.bob += dt * 12;
  return true;
}

export function updateChef(game, player, dt) {
  const c = game.chef;
  if (game.phase !== 'playing') { c.moving = false; return; }
  if (c.target) {
    const arrived = !walkTo(game, c.target.x, c.target.y, dt);
    if (arrived) {
      const use = c.target.use;
      c.target = null;
      if (use) useStation(game, player.sfx);
    }
    return;
  }
  let dx = 0;
  let dy = 0;
  if (player.keys.has('left')) dx -= 1;
  if (player.keys.has('right')) dx += 1;
  if (player.keys.has('up')) dy -= 1;
  if (player.keys.has('down')) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    c.x += (dx / len) * SPEED * dt;
    c.y += (dy / len) * SPEED * dt;
    c.dir = dx !== 0 ? Math.sign(dx) : c.dir;
    c.moving = true;
    c.bob += dt * 12;
  } else {
    c.moving = false;
  }
  c.x = Math.max(FLOOR.x0, Math.min(FLOOR.x1, c.x));
  c.y = Math.max(FLOOR.y0, Math.min(FLOOR.y1, c.y));
}

// The one interaction entry point: plating has its own flow at the counter.
export function useStation(game, sfx) {
  const station = nearestStation(game);
  if (!station) return;
  if (station.kind === 'plates') {
    const carry = game.carry;
    if (carry && carry.kind === 'ingredient' && carry.prepped) {
      if (plateAtCounter(game, sfx)) return;
    }
    if (!carry && station.plate) {
      game.carry = station.plate;
      station.plate = null;
      station.readyDish = null;
      sfx.pickup();
      return;
    }
  }
  interact(game, sfx);
}

export function clickStation(game, x, y) {
  if (game.phase !== 'playing') return;
  let best = null;
  let bestD = 1e9;
  for (const s of game.stations) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (best && bestD < 200) {
    game.chef.target = { x: best.x + best.w / 2, y: best.y + best.h + 26, use: true };
  } else {
    game.chef.target = { x: Math.max(FLOOR.x0, Math.min(FLOOR.x1, x)), y: Math.max(FLOOR.y0, Math.min(FLOOR.y1, y)), use: false };
  }
}

export function binCarried(game, sfx) {
  if (!game.carry || game.phase !== 'playing') return;
  game.carry = null;
  sfx.trash();
}
