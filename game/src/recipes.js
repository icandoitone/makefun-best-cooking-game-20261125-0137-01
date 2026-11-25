// Warung Rush — recipes and ingredients.
// Every dish is a set of components. Each component is one ingredient plus
// the prep it needs: chop it on the board, or fry it on a burner. A plate
// becomes a finished dish only when its contents match a recipe exactly.

export const INGREDIENTS = {
  rice:    { id: 'rice',    name: 'Rice',    prep: 'cook', color: '#fff6d8', dark: '#e8d9a8', emoji: '🍚' },
  noodle:  { id: 'noodle',  name: 'Noodle',  prep: 'cook', color: '#ffd97a', dark: '#d9a83c', emoji: '🍜' },
  chicken: { id: 'chicken', name: 'Chicken', prep: 'cook', color: '#f2a65e', dark: '#b96f2a', emoji: '🍗' },
  egg:     { id: 'egg',     name: 'Egg',     prep: 'cook', color: '#ffe9a8', dark: '#e0b95c', emoji: '🥚' },
  chilli:  { id: 'chilli',  name: 'Chilli',  prep: 'chop', color: '#e8442e', dark: '#a11f14', emoji: '🌶️' },
  veg:     { id: 'veg',     name: 'Greens',  prep: 'chop', color: '#58b368', dark: '#2e7d3c', emoji: '🥬' },
};

// Prep times in seconds. Chopping is quick, frying takes longer and can burn.
export const CHOP_TIME = 1.4;
export const COOK_TIME = 6.0;
export const BURN_AFTER = 5.0;

export const RECIPES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    blurb: 'Wok-fried rice, egg & chilli',
    price: 26,
    color: '#ffb347',
    needs: ['rice', 'egg', 'chilli'],
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    blurb: 'Noodles, chicken & greens',
    price: 30,
    color: '#f2c14e',
    needs: ['noodle', 'chicken', 'veg'],
  },
  {
    id: 'ayam-geprek',
    name: 'Ayam Geprek',
    blurb: 'Smashed fried chicken, fiery chilli',
    price: 34,
    color: '#e8703a',
    needs: ['chicken', 'chilli', 'chilli'],
  },
  {
    id: 'sup-sayur',
    name: 'Sup Sayur',
    blurb: 'Greens, egg & noodles',
    price: 22,
    color: '#7bc96f',
    needs: ['veg', 'egg', 'noodle'],
  },
  {
    id: 'nasi-ayam',
    name: 'Nasi Ayam Lada',
    blurb: 'Chicken rice, egg on top',
    price: 32,
    color: '#e8a34c',
    needs: ['rice', 'chicken', 'egg'],
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

// True when the plate's ingredient ids match a recipe's needs as a multiset.
export function matchRecipe(ids) {
  const sorted = [...ids].sort().join(',');
  return RECIPES.find((r) => [...r.needs].sort().join(',') === sorted) || null;
}

// Which recipes are on the menu on a given day: the first two from day 1,
// a new dish joins the menu each following day.
export function menuForDay(day) {
  return RECIPES.slice(0, Math.min(2 + day - 1, RECIPES.length));
}

export function ingredientLabel(id) {
  const ing = INGREDIENTS[id];
  return ing ? ing.name : id;
}
