// Warung Rush — every pixel the player sees, drawn on one canvas.
// Warm warung palette: terracotta walls, teak counters, checkered floor.
// Food, the chef and the stations are all vector shapes drawn here —
// no image files, so the game stays offline and tiny.

import { INGREDIENTS, recipeById, matchRecipe, menuForDay } from './recipes.js';
import { nearestStation, stationById } from './kitchen.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function ring(ctx, x, y, r, frac, color, width) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = width || 6;
  ctx.stroke();
  if (frac > 0) {
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

// One ingredient, drawn as a little vector icon. `prepped` adds a glow ring
// (chopped greens, a fried egg) so ready ingredients read at a glance.
export function drawIngredient(ctx, id, x, y, r, prepped) {
  const ing = INGREDIENTS[id];
  if (!ing) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff8e6';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ing.dark;
  ctx.stroke();
  ctx.fillStyle = ing.color;
  ctx.strokeStyle = ing.dark;
  if (id === 'rice') {
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ing.dark;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - r * 0.3 + i * r * 0.15, y + (i % 2 ? -r * 0.2 : r * 0.2), 1.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'noodle') {
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x, y, r * (0.55 - i * 0.14), 0.4 + i, Math.PI * 1.4 + i); ctx.stroke();
    }
  } else if (id === 'chicken') {
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.6, r * 0.42, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f7ead2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + r * 0.45, y - r * 0.25); ctx.lineTo(x + r * 0.8, y - r * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 0.82, y - r * 0.62, r * 0.14, 0, Math.PI * 2); ctx.fillStyle = '#f7ead2'; ctx.fill();
  } else if (id === 'egg') {
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.62, r * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0, Math.PI * 2); ctx.fillStyle = '#f6b93b'; ctx.fill();
  } else if (id === 'chilli') {
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r * 0.28, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d3c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r * 0.3); ctx.quadraticCurveTo(x + r * 0.75, y - r * 0.6, x + r * 0.55, y - r * 0.75); ctx.stroke();
  } else if (id === 'veg') {
    ctx.beginPath(); ctx.ellipse(x - r * 0.2, y, r * 0.45, r * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.25, y - r * 0.1, r * 0.45, r * 0.3, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ing.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.3); ctx.lineTo(x + r * 0.5, y + r * 0.3); ctx.stroke();
  }
  if (prepped) {
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, items, readyName) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, 34, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fdf6e3'; ctx.fill();
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 2; ctx.stroke();
  items.forEach((id, i) => {
    drawIngredient(ctx, id, x - 18 + i * 18, y - 4, 11, true);
  });
  if (readyName) {
    text(ctx, '✓ ' + readyName, x, y - 26, 12, '#7bc96f', 'center');
  }
  ctx.restore();
}

function drawChef(ctx, game) {
  const c = game.chef;
  const bob = c.moving ? Math.sin(c.bob) * 3 : 0;
  const x = c.x;
  const y = c.y + bob * 0.3;
  ctx.save();
  // shadow
  ctx.beginPath(); ctx.ellipse(x, c.y + 26, 26, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  // legs
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(x - 12, y + 8, 10, 18);
  ctx.fillRect(x + 2, y + 8, 10, 18);
  // body + apron
  ctx.beginPath(); rr(ctx, x - 20, y - 12, 40, 34, 10); ctx.fillStyle = '#f4f1e8'; ctx.fill();
  ctx.beginPath(); rr(ctx, x - 14, y + 2, 28, 20, 6); ctx.fillStyle = '#e2574c'; ctx.fill();
  // arms
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(x - 27, y - 6, 9, 20);
  ctx.fillRect(x + 18, y - 6, 9, 20);
  // head
  ctx.beginPath(); ctx.arc(x, y - 24, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#f2c79b'; ctx.fill();
  // chef hat
  ctx.beginPath(); ctx.arc(x, y - 36, 13, Math.PI, 0); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.fillRect(x - 13, y - 38, 26, 7);
  // face
  ctx.fillStyle = '#26221c';
  ctx.beginPath(); ctx.arc(x - 5 * c.dir, y - 26, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 * c.dir, y - 26, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#26221c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x + 2 * c.dir, y - 19, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // carried item above the head
  const carry = game.carry;
  if (carry) {
    const cy = y - 62;
    if (carry.kind === 'ingredient') {
      drawIngredient(ctx, carry.id, x, cy, 15, carry.prepped);
    } else {
      drawPlate(ctx, x, cy + 6, carry.items, null);
      const dish = matchRecipe(carry.items);
      if (dish) text(ctx, dish.name, x, cy - 24, 13, '#ffd76a', 'center');
    }
  }
  ctx.restore();
}

function drawOrders(ctx, game) {
  rr(ctx, 14, 84, 288, 330, 12);
  ctx.fillStyle = '#fff3d6'; ctx.fill();
  ctx.strokeStyle = '#b98d4f'; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, '🍽  ORDER BOARD', 158, 108, 19, '#7a4a1f', 'center');
  ctx.fillStyle = '#e8d3a8';
  ctx.fillRect(30, 122, 256, 2);
  if (!game.orders.length) {
    text(ctx, 'No orders yet —', 158, 180, 15, '#8a6a3f', 'center');
    text(ctx, 'the lunch rush is coming!', 158, 204, 15, '#8a6a3f', 'center');
  }
  game.orders.forEach((o, i) => {
    const recipe = recipeById(o.recipeId);
    const y = 146 + i * 68;
    const frac = Math.max(0, o.patience / o.maxPatience);
    rr(ctx, 28, y, 260, 60, 8);
    ctx.fillStyle = frac > 0.5 ? '#fffaf0' : frac > 0.25 ? '#ffedd6' : '#ffd9d0';
    ctx.fill();
    ctx.strokeStyle = '#d9b77c'; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, '#' + o.id + '  ' + recipe.name, 40, y + 14, 15, '#4a2c14', 'left');
    text(ctx, recipe.price + 'c', 276, y + 14, 14, '#b57708', 'right');
    recipe.needs.forEach((id, j) => drawIngredient(ctx, id, 52 + j * 30, y + 38, 11, false));
    // patience bar
    ctx.fillStyle = '#e5d3ae';
    rr(ctx, 150, y + 30, 128, 14, 7); ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#f2a93b' : '#e8442e';
    if (frac > 0) { rr(ctx, 150, y + 30, 128 * frac, 14, 7); ctx.fill(); }
    text(ctx, Math.ceil(o.patience) + 's', 214, y + 37, 11, '#fff', 'center');
  });
  // menu strip
  text(ctx, 'TODAY’S MENU', 158, 436, 13, '#fff3dd', 'center');
  menuForDay(game.day).forEach((r, i) => {
    const y = 456 + i * 24;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    rr(ctx, 22, y - 10, 272, 20, 8); ctx.fill();
    text(ctx, r.name + ' — ' + r.blurb, 34, y, 12, '#ffe9bd', 'left');
  });
  // how-to panel fills the lower-left corner
  const hy = 436 + menuForDay(game.day).length * 24 + 22;
  rr(ctx, 14, hy, 288, 700 - hy - 14, 12);
  ctx.fillStyle = 'rgba(255,243,214,.08)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,243,214,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, 'HOW TO PLAY', 158, hy + 22, 14, '#ffd76a', 'center');
  const tips = [
    '1 · Grab food from the pantry',
    '2 · Chop chilli & greens, fry the rest',
    '3 · Build the dish on a plate',
    '4 · Serve it at the window in time',
    'Pans burn if left on the heat!',
    'Fast serves earn tips & combos.',
  ];
  tips.forEach((t, i) => {
    const y = hy + 46 + i * 18;
    if (y <= 678) text(ctx, t, 30, y, 13, '#ffe9bd', 'left');
  });
}

function drawCounter(ctx, s, label, highlight) {
  rr(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fillStyle = '#8a5a2e'; ctx.fill();
  ctx.strokeStyle = highlight ? '#ffd76a' : '#5e3a1a';
  ctx.lineWidth = highlight ? 4 : 2;
  ctx.stroke();
  rr(ctx, s.x + 6, s.y + 6, s.w - 12, 18, 6);
  ctx.fillStyle = '#a9743f'; ctx.fill();
  text(ctx, label, s.x + s.w / 2, s.y + s.h - 12, 12, '#ffe9bd', 'center');
}

function drawKitchen(ctx, game) {
  // walls + floor
  ctx.fillStyle = '#3d2417';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#f7e3b8';
  for (let r = 0; r < 8; r++) {
    for (let cix = 0; cix < 10; cix++) {
      if ((r + cix) % 2 === 0) continue;
      ctx.fillStyle = '#f2d9a4';
      ctx.fillRect(300 + cix * 98, 170 + r * 68, 98, 68);
    }
  }
  ctx.fillStyle = '#f7e3b8';
  ctx.fillRect(300, 170, 980, 544);
  ctx.fillStyle = 'rgba(0,0,0,.05)';
  for (let r = 0; r < 8; r++) for (let cix = 0; cix < 10; cix++) {
    if ((r + cix) % 2) ctx.fillRect(300 + cix * 98, 170 + r * 68, 98, 68);
  }
  // (open floor: the chef's walkway stays clear so stations read at a glance)

  const near = game.phase === 'playing' ? nearestStation(game) : null;
  for (const s of game.stations) {
    const hl = near && near.id === s.id;
    if (s.kind === 'bin') {
      const ing = INGREDIENTS[s.ingredient];
      rr(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = '#7a4a22'; ctx.fill();
      ctx.strokeStyle = hl ? '#ffd76a' : '#4e2c10';
      ctx.lineWidth = hl ? 4 : 2; ctx.stroke();
      drawIngredient(ctx, s.ingredient, s.x + s.w / 2, s.y + 30, 18, false);
      text(ctx, ing.name, s.x + s.w / 2, s.y + s.h - 10, 12, '#ffe9bd', 'center');
    } else if (s.kind === 'board') {
      drawCounter(ctx, s, '🔪 CHOPPING BOARD', hl);
      ctx.fillStyle = '#e8c98f';
      ctx.fillRect(s.x + 20, s.y + 30, s.w - 40, 34);
      if (s.item) {
        drawIngredient(ctx, s.item, s.x + s.w / 2, s.y + 47, 16, false);
        if (s.progress < 1) {
          ring(ctx, s.x + s.w / 2, s.y + 47, 24, s.progress, '#58b368', 5);
        } else {
          text(ctx, '✓ chopped — take it!', s.x + s.w / 2, s.y + 14, 11, '#2e7d3c', 'center');
        }
      } else {
        text(ctx, 'bring chilli / greens', s.x + s.w / 2, s.y + 47, 12, '#7a5a34', 'center');
      }
    } else if (s.kind === 'stove') {
      drawCounter(ctx, s, '🍳 STOVE — 2 BURNERS', hl);
      s.burners.forEach((b, i) => {
        const bx = s.x + 60 + i * 150;
        const by = s.y + 48;
        // flame
        if (b.item && !b.burnt) {
          const fl = 8 + Math.sin(game.time * 9 + i * 2) * 3;
          ctx.beginPath(); ctx.ellipse(bx, by + 16, 22, fl, 0, 0, Math.PI * 2);
          ctx.fillStyle = b.progress >= 1 ? '#ff9d2e' : '#ffcf5e'; ctx.fill();
        }
        // pan
        ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#3a3f4a'; ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#22242c'; ctx.fill();
        if (b.item) {
          if (b.burnt) {
            ctx.beginPath(); ctx.arc(bx, by, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#14100c'; ctx.fill();
            text(ctx, 'BURNT!', bx, by - 34, 12, '#e8442e', 'center');
          } else {
            drawIngredient(ctx, b.item, bx, by, 15, false);
            ring(ctx, bx, by, 30, b.progress, b.progress >= 1 ? '#58b368' : '#ff9d2e', 5);
            if (b.progress >= 1) text(ctx, 'READY ✓', bx, by - 34, 12, '#7bc96f', 'center');
          }
        } else {
          text(ctx, 'empty', bx, by, 11, '#8a93a5', 'center');
        }
      });
    } else if (s.kind === 'plates') {
      drawCounter(ctx, s, '🍽 PLATING', hl);
      if (s.plate) {
        drawPlate(ctx, s.x + s.w / 2, s.y + 48, s.plate.items, s.readyDish ? recipeById(s.readyDish).name : null);
      } else {
        ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, s.y + 48, 30, 10, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 2; ctx.stroke();
        text(ctx, 'add prepped food', s.x + s.w / 2, s.y + 30, 11, '#ffe9bd', 'center');
      }
    } else if (s.kind === 'serve') {
      rr(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = '#5b3a6e'; ctx.fill();
      ctx.strokeStyle = hl ? '#ffd76a' : '#3a2350';
      ctx.lineWidth = hl ? 4 : 2; ctx.stroke();
      text(ctx, '🛎 SERVING', s.x + s.w / 2, s.y + 22, 15, '#ffe9bd', 'center');
      text(ctx, 'WINDOW', s.x + s.w / 2, s.y + 42, 15, '#ffe9bd', 'center');
      // bell
      ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 90, 22, Math.PI, 0); ctx.fillStyle = '#ffd76a'; ctx.fill();
      ctx.fillRect(s.x + s.w / 2 - 26, s.y + 88, 52, 6);
      ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 104, 5, 0, Math.PI * 2); ctx.fillStyle = '#e8b04b'; ctx.fill();
      text(ctx, 'serve matching', s.x + s.w / 2, s.y + 140, 12, '#e8d3ff', 'center');
      text(ctx, 'orders here', s.x + s.w / 2, s.y + 158, 12, '#e8d3ff', 'center');
      // impatient customers hint
      text(ctx, '😋 😋 😋', s.x + s.w / 2, s.y + 184, 16, '#fff', 'center');
    } else if (s.kind === 'trash') {
      rr(ctx, s.x, s.y, s.w, s.h, 10);
      ctx.fillStyle = '#4a4a52'; ctx.fill();
      ctx.strokeStyle = hl ? '#ffd76a' : '#2c2c33';
      ctx.lineWidth = hl ? 4 : 2; ctx.stroke();
      text(ctx, '🗑 BIN (Q)', s.x + s.w / 2, s.y + s.h / 2, 15, '#e8e8f0', 'center');
    }
  }

  // steam + sizzle particles
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawChef(ctx, game);

  // floating score text
  for (const f of game.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 20, f.color, 'center');
    ctx.globalAlpha = 1;
  }

  if (game.shake > 0) {
    ctx.fillStyle = 'rgba(232,68,46,' + (game.shake * 0.25) + ')';
    ctx.fillRect(0, 0, 1280, 720);
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = '#241407';
  ctx.fillRect(0, 0, 1280, 80);
  ctx.fillStyle = '#e2574c';
  ctx.fillRect(0, 78, 1280, 2);
  text(ctx, '🔥 WARUNG RUSH', 24, 30, 26, '#ffd76a', 'left');
  text(ctx, 'Sizzle & Serve', 24, 58, 13, '#e8c98f', 'left');
  // day + shift timer
  const frac = Math.max(0, game.shiftLeft / 150);
  text(ctx, 'DAY ' + game.day, 330, 26, 17, '#fff3dd', 'left');
  ctx.fillStyle = '#3a2412';
  rr(ctx, 330, 40, 320, 18, 9); ctx.fill();
  ctx.fillStyle = frac > 0.33 ? '#58b368' : '#e8442e';
  if (frac > 0) { rr(ctx, 330, 40, 320 * frac, 18, 9); ctx.fill(); }
  const mm = Math.floor(game.shiftLeft / 60);
  const ss = Math.floor(game.shiftLeft % 60);
  text(ctx, '⏱ ' + mm + ':' + String(ss).padStart(2, '0') + ' left in the shift', 660, 49, 15, frac > 0.33 ? '#fff3dd' : '#ff9d8a', 'left');
  // coins / score / combo / hearts
  text(ctx, '🪙 ' + game.coins, 900, 30, 20, '#ffd76a', 'left');
  text(ctx, 'SCORE ' + game.score, 900, 56, 14, '#fff3dd', 'left');
  text(ctx, game.combo >= 2 ? '🔥 COMBO x' + game.combo : 'combo —', 1060, 30, 16, game.combo >= 2 ? '#ff9d5c' : '#c9a67a', 'left');
  let hearts = '';
  for (let i = 0; i < 3; i++) hearts += i < game.hearts ? '❤️' : '🖤';
  text(ctx, hearts, 1060, 56, 15, '#fff', 'left');
  if (game.orders.length >= 3) {
    text(ctx, '⚠ RUSH HOUR!', 1240, 56, 15, '#ff9d5c', 'right');
  }
  if (game.messageLife > 0) {
    ctx.globalAlpha = Math.min(1, game.messageLife);
    rr(ctx, 390, 88, 500, 30, 15);
    ctx.fillStyle = 'rgba(20,12,6,.85)'; ctx.fill();
    text(ctx, game.message, 640, 103, 14, '#ffe9a8', 'center');
    ctx.globalAlpha = 1;
  }
}

function overlay(ctx, title, lines, foot, accent) {
  ctx.fillStyle = 'rgba(20,10,4,.78)';
  ctx.fillRect(0, 0, 1280, 720);
  rr(ctx, 340, 150, 600, 400, 18);
  ctx.fillStyle = '#fff3d6'; ctx.fill();
  ctx.strokeStyle = accent || '#e2574c'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, title, 640, 210, 34, '#7a2c1a', 'center');
  lines.forEach((l, i) => text(ctx, l, 640, 270 + i * 34, 18, '#4a2c14', 'center'));
  text(ctx, foot, 640, 500, 15, '#8a6a3f', 'center');
}

export function draw(ctx, game) {
  ctx.clearRect(0, 0, 1280, 720);
  if (game.phase === 'title') {
    drawKitchen(ctx, game);
    drawOrders(ctx, game);
    drawHud(ctx, game);
    overlay(ctx, '🍳 WARUNG RUSH', [
      'Run the busiest little warung in town!',
      'Chop, fry, plate and serve before orders walk out.',
      'WASD / arrows to walk · E to use a station · click a station to go there',
      'Chilli & greens go on the board — rice, noodles, chicken & egg on the stove.',
      'Two burners, one board, one very impatient lunch crowd.',
    ], 'Press ENTER or click anywhere to open the warung', '#e2574c');
    return;
  }
  drawKitchen(ctx, game);
  drawOrders(ctx, game);
  drawHud(ctx, game);
  if (game.phase === 'dayEnd') {
    const menu = menuForDay(game.day + 1);
    overlay(ctx, '🎉 DAY ' + game.day + ' DONE!', [
      'Served ' + game.stats.servedToday + ' dishes · earned ' + game.stats.earnedToday + ' coins',
      'Total: ' + game.coins + ' coins · best combo x' + game.bestCombo,
      'Tomorrow the crowd is hungrier — and ' + (menu.length > menuForDay(game.day).length ? 'a new dish joins the menu: ' + menu[menu.length - 1].name + '!' : 'orders come faster.'),
    ], 'Press ENTER for Day ' + (game.day + 1), '#58b368');
  } else if (game.phase === 'over') {
    overlay(ctx, '😮‍💨 WARUNG CLOSED', [
      'Three orders walked out — the crowd drifted away.',
      'You served ' + game.served + ' dishes and earned ' + game.coins + ' coins',
      'over ' + game.day + ' day' + (game.day > 1 ? 's' : '') + ' · best combo x' + game.bestCombo,
    ], 'Press R to open again tomorrow', '#e8442e');
  }
}
