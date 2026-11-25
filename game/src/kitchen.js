// Warung Rush — kitchen state: orders, stations, the shift clock, scoring.
// The kitchen is a small warung: pantry bins along the top, a chopping board,
// two stove burners, a plating counter and a serving window. The chef carries
// one thing at a time (a raw ingredient, a prepped ingredient, or a plate).

import { INGREDIENTS, RECIPES, CHOP_TIME, COOK_TIME, BURN_AFTER, recipeById, matchRecipe, menuForDay } from './recipes.js';

export const SHIFT_LENGTH = 150; // seconds per day
export const MAX_HEARTS = 3;

export function makeStation(id, kind, x, y, w, h, extra = {}) {
  return { id, kind, x, y, w, h, ...extra };
}

// Station layout on the 1280x720 floor. The pantry is the top row of bins,
// the work counters sit mid-floor, the serving window is on the right wall.
export function buildStations() {
  const bins = ['rice', 'noodle', 'chicken', 'egg', 'chilli', 'veg'].map((ing, i) =>
    makeStation('bin-' + ing, 'bin', 330 + i * 108, 96, 96, 74, { ingredient: ing }));
  return [
    ...bins,
    makeStation('board', 'board', 330, 250, 190, 96, { progress: 0, item: null }),
    makeStation('stove', 'stove', 560, 250, 300, 96, {
      burners: [
        { item: null, progress: 0, burnt: false },
        { item: null, progress: 0, burnt: false },
      ],
    }),
    makeStation('plates', 'plates', 900, 250, 150, 96, {}),
    makeStation('serve', 'serve', 1090, 250, 150, 200, {}),
    makeStation('trash', 'trash', 1090, 560, 150, 90, {}),
  ];
}

export function newGame() {
  return {
    phase: 'title', // title | playing | dayEnd | over
    day: 1,
    shiftLeft: SHIFT_LENGTH,
    coins: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    hearts: MAX_HEARTS,
    orders: [],
    orderSeq: 0,
    spawnIn: 2.5,
    chef: { x: 640, y: 560, dir: 1, moving: false, target: null, bob: 0 },
    carry: null, // { kind: 'ingredient', id, prepped } | { kind: 'plate', items: [] }
    stations: buildStations(),
    floaters: [], // { x, y, text, color, life }
    particles: [],
    shake: 0,
    time: 0,
    message: '',
    messageLife: 0,
    stats: { earnedToday: 0, servedToday: 0 },
  };
}

export function stationById(game, id) {
  return game.stations.find((s) => s.id === id);
}

function patienceFor(day) {
  return Math.max(30, 52 - day * 3);
}

function spawnIntervalFor(day) {
  return Math.max(8, 15 - day * 1.2);
}

export function spawnOrder(game) {
  const menu = menuForDay(game.day);
  const recipe = menu[Math.floor(Math.random() * menu.length)];
  const patience = patienceFor(game.day);
  game.orderSeq += 1;
  game.orders.push({
    id: game.orderSeq,
    recipeId: recipe.id,
    patience,
    maxPatience: patience,
    born: game.time,
  });
}

export function addFloater(game, x, y, text, color) {
  game.floaters.push({ x, y, text, color: color || '#ffe9a8', life: 1.4 });
}

export function addBurst(game, x, y, color, n) {
  for (let i = 0; i < (n || 10); i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 160,
      vy: -40 - Math.random() * 120,
      life: 0.5 + Math.random() * 0.5,
      max: 1,
      color: color || '#ffcf5e',
      r: 2 + Math.random() * 3,
    });
  }
}

export function flashMessage(game, text) {
  game.message = text;
  game.messageLife = 2.2;
}

// --- Interaction -----------------------------------------------------------

// What the chef is standing next to, by proximity to a station's front edge.
export function nearestStation(game) {
  const c = game.chef;
  let best = null;
  let bestD = 1e9;
  for (const s of game.stations) {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h + 26;
    const d = Math.hypot(c.x - cx, c.y - cy);
    if (d < bestD) { bestD = d; best = s; }
  }
  return bestD < 110 ? best : null;
}

function plateDishName(plate) {
  const dish = matchRecipe(plate.items);
  return dish ? dish.name : null;
}

export function interact(game, sfx) {
  const station = nearestStation(game);
  if (!station || game.phase !== 'playing') return false;
  const carry = game.carry;

  if (station.kind === 'bin') {
    if (carry) { flashMessage(game, 'Hands full — serve or bin it first'); sfx.nope(); return false; }
    game.carry = { kind: 'ingredient', id: station.ingredient, prepped: false };
    sfx.pickup();
    return true;
  }

  if (station.kind === 'board') {
    if (station.item) {
      // Take the chopped result back.
      if (carry) { flashMessage(game, 'Hands full'); sfx.nope(); return false; }
      game.carry = { kind: 'ingredient', id: station.item, prepped: true };
      station.item = null;
      station.progress = 0;
      sfx.pickup();
      return true;
    }
    if (carry && carry.kind === 'ingredient' && !carry.prepped && INGREDIENTS[carry.id].prep === 'chop') {
      station.item = carry.id;
      station.progress = 0;
      game.carry = null;
      sfx.chop();
      return true;
    }
    flashMessage(game, 'The board is for chopping chilli & greens');
    sfx.nope();
    return false;
  }

  if (station.kind === 'stove') {
    // Take a finished pan first if the chef's hands are free.
    const done = station.burners.find((b) => b.item && b.progress >= 1 && !b.burnt);
    if (done && !carry) {
      game.carry = { kind: 'ingredient', id: done.item, prepped: true };
      done.item = null; done.progress = 0; done.burnt = false; done.doneAt = 0;
      sfx.pickup();
      return true;
    }
    if (carry && carry.kind === 'ingredient' && !carry.prepped && INGREDIENTS[carry.id].prep === 'cook') {
      const free = station.burners.find((b) => !b.item);
      if (!free) { flashMessage(game, 'Both burners are busy!'); sfx.nope(); return false; }
      free.item = carry.id; free.progress = 0; free.burnt = false;
      game.carry = null;
      sfx.sizzle();
      return true;
    }
    if (station.burners.some((b) => b.burnt)) {
      // Clear a burnt pan (hands must be free).
      if (carry) { flashMessage(game, 'Hands full — bin the burnt pan first'); sfx.nope(); return false; }
      const burnt = station.burners.find((b) => b.burnt);
      burnt.item = null; burnt.progress = 0; burnt.burnt = false; burnt.doneAt = 0;
      flashMessage(game, 'Burnt pan scrubbed clean');
      sfx.trash();
      return true;
    }
    flashMessage(game, 'The stove fries rice, noodles, chicken & egg');
    sfx.nope();
    return false;
  }

  if (station.kind === 'plates') {
    if (!carry) {
      game.carry = { kind: 'plate', items: [] };
      sfx.pickup();
      return true;
    }
    if (carry.kind === 'plate') { flashMessage(game, 'Already holding a plate'); sfx.nope(); return false; }
    if (carry.kind === 'ingredient' && carry.prepped) {
      // Put a prepped ingredient down on the counter plate stack? No — the
      // chef must be holding the plate. Nudge the player instead.
      flashMessage(game, 'Pick up a plate first, then add this to it');
      sfx.nope();
      return false;
    }
    flashMessage(game, 'That still needs prepping');
    sfx.nope();
    return false;
  }

  if (station.kind === 'serve') {
    if (!carry || carry.kind !== 'plate') { flashMessage(game, 'Bring a finished plate to the window'); sfx.nope(); return false; }
    const dish = matchRecipe(carry.items);
    if (!dish) { flashMessage(game, 'That plate is not a finished dish yet'); sfx.nope(); return false; }
    const order = game.orders.find((o) => o.recipeId === dish.id);
    if (!order) { flashMessage(game, 'Nobody ordered ' + dish.name + ' right now'); sfx.nope(); return false; }
    serveOrder(game, order, dish, sfx);
    game.carry = null;
    return true;
  }

  if (station.kind === 'trash') {
    if (!carry) { flashMessage(game, 'Nothing to bin'); sfx.nope(); return false; }
    game.carry = null;
    sfx.trash();
    return true;
  }
  return false;
}

// Add a prepped ingredient the chef carries onto the plate they also... the
// chef carries one thing, so plating happens at the plating counter: press
// interact while holding a prepped ingredient there and it goes onto the
// plate waiting on the counter. The counter keeps one plate in progress.
export function plateAtCounter(game, sfx) {
  const station = stationById(game, 'plates');
  const carry = game.carry;
  if (!station || !carry) return false;
  if (carry.kind === 'ingredient' && carry.prepped) {
    if (!station.plate) station.plate = { kind: 'plate', items: [] };
    if (station.plate.items.length >= 3) { flashMessage(game, 'That plate is full'); sfx.nope(); return false; }
    station.plate.items.push(carry.id);
    game.carry = null;
    sfx.plate();
    const dish = matchRecipe(station.plate.items);
    if (dish) {
      addBurst(game, station.x + station.w / 2, station.y + 20, '#ffd76a', 16);
      flashMessage(game, dish.name + ' is ready — serve it!');
      sfx.ready();
    }
    return true;
  }
  if (carry.kind === 'plate' && !station.plate) {
    station.plate = carry;
    game.carry = null;
    sfx.plate();
    return true;
  }
  return false;
}

function serveOrder(game, order, dish, sfx) {
  const left = order.patience / order.maxPatience;
  const tip = Math.round(dish.price * 0.5 * left);
  const comboBonus = Math.min(game.combo, 5) * 2;
  const earned = dish.price + tip + comboBonus;
  game.coins += earned;
  game.score += earned * 10;
  game.combo += 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  game.served += 1;
  game.stats.servedToday += 1;
  game.stats.earnedToday += earned;
  game.orders = game.orders.filter((o) => o.id !== order.id);
  const sx = 1165, sy = 300;
  addFloater(game, sx, sy, '+' + earned + ' coins', '#ffd76a');
  if (game.combo >= 3) addFloater(game, sx, sy + 26, 'COMBO x' + game.combo + '!', '#ff9d5c');
  addBurst(game, sx, sy, '#ffd76a', 18);
  sfx.serve();
}

function missOrder(game, order, sfx) {
  game.orders = game.orders.filter((o) => o.id !== order.id);
  game.hearts -= 1;
  game.combo = 0;
  game.missed += 1;
  game.shake = 0.35;
  flashMessage(game, 'Order walked out: ' + recipeById(order.recipeId).name);
  sfx.miss();
}

// --- Tick ------------------------------------------------------------------

export function tick(game, dt, sfx) {
  game.time += dt;
  if (game.messageLife > 0) game.messageLife -= dt;
  if (game.shake > 0) game.shake -= dt;
  for (const f of game.floaters) { f.life -= dt; f.y -= 34 * dt; }
  game.floaters = game.floaters.filter((f) => f.life > 0);
  for (const p of game.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }
  game.particles = game.particles.filter((p) => p.life > 0);

  if (game.phase !== 'playing') return;

  game.shiftLeft -= dt;
  if (game.shiftLeft <= 0) { endDay(game, sfx); return; }

  // Chopping progress.
  const board = stationById(game, 'board');
  if (board.item) {
    board.progress += dt / CHOP_TIME;
    if (board.progress >= 1) {
      board.progress = 1;
      // stays ready until collected
    }
  }

  // Burners cook, then burn.
  const stove = stationById(game, 'stove');
  for (const b of stove.burners) {
    if (!b.item || b.burnt) continue;
    b.progress += dt / COOK_TIME;
    if (b.progress >= 1 && !b.doneAt) b.doneAt = game.time;
    if (b.progress >= 1 && game.time - (b.doneAt || game.time) > BURN_AFTER) {
      b.burnt = true;
      flashMessage(game, 'A pan burnt! Clear it at the stove');
      sfx.burn();
    }
  }

  // Orders: patience drains, spawn timer ticks.
  for (const o of [...game.orders]) {
    o.patience -= dt;
    if (o.patience <= 0) missOrder(game, o, sfx);
  }
  if (game.hearts <= 0) { game.phase = 'over'; sfx.over(); return; }
  if (game.orders.length < 4) {
    game.spawnIn -= dt;
    if (game.spawnIn <= 0) {
      spawnOrder(game);
      game.spawnIn = spawnIntervalFor(game.day) * (0.8 + Math.random() * 0.4);
    }
  }

  // Plating counter: a finished plate waits to be picked up.
  const plates = stationById(game, 'plates');
  if (plates.plate) {
    const dish = matchRecipe(plates.plate.items);
    plates.readyDish = dish ? dish.id : null;
  }
}

function endDay(game, sfx) {
  game.phase = 'dayEnd';
  game.stats.earnedToday = game.stats.earnedToday || 0;
  sfx.dayEnd();
}

export function nextDay(game) {
  game.day += 1;
  game.shiftLeft = SHIFT_LENGTH;
  game.orders = [];
  game.spawnIn = 2;
  game.stats = { earnedToday: 0, servedToday: 0 };
  const stove = stationById(game, 'stove');
  for (const b of stove.burners) { b.item = null; b.progress = 0; b.burnt = false; b.doneAt = 0; }
  const board = stationById(game, 'board');
  board.item = null; board.progress = 0;
  const plates = stationById(game, 'plates');
  plates.plate = null; plates.readyDish = null;
  game.carry = null;
  game.phase = 'playing';
}

export function startGame(game) {
  const fresh = newGame();
  Object.assign(game, fresh, { phase: 'playing' });
  spawnOrder(game);
  spawnOrder(game);
  game.spawnIn = 9;
}
