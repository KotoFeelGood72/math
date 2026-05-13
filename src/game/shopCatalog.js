/**
 * Каталог магазина: заряды бустеров за монеты.
 *
 * @typedef {{ id: string, price: number, title: string, hint: string } & (
 *   | { type: 'single', kind: 'bomb' | 'clock' | 'star', qty: number }
 *   | { type: 'bundle', bundle: { bomb: number, clock: number, star: number } }
 * )} ShopOffer
 */

/** @type {ShopOffer[]} */
export const SHOP_OFFERS = [
  {
    id: 'bomb_1',
    type: 'single',
    kind: 'bomb',
    qty: 1,
    price: 45,
    title: 'Бомба',
    hint: 'Взрыв 3×3. Добавляет заряды к старту уровня (до 8 сверх базовых за один заход)',
  },
  {
    id: 'clock_1',
    type: 'single',
    kind: 'clock',
    qty: 1,
    price: 40,
    title: 'Время',
    hint: 'Откат хода или +3 хода, если откатывать нечего',
  },
  {
    id: 'star_1',
    type: 'single',
    kind: 'star',
    qty: 1,
    price: 55,
    title: 'Звезда',
    hint: 'Убирает все фишки выбранного цвета с поля',
  },
  {
    id: 'bundle_small',
    type: 'bundle',
    price: 120,
    title: 'Набор «Трио»',
    hint: 'По одному заряду каждого бустера',
    bundle: { bomb: 1, clock: 1, star: 1 },
  },
]
