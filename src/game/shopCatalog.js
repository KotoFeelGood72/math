/**
 * Каталог магазина: заряды бустеров за монеты.
 *
 * @typedef {{ id: string, price: number, title: string, hint: string } & (
 *   | { type: 'single', kind: 'bomb' | 'clock' | 'star', qty: number }
 *   | { type: 'bundle', bundle: { bomb: number, clock: number, star: number } }
 * )} ShopOffer
 */

import { BOOSTER_DISPLAY_NAME, SHOP_BUNDLE_DISPLAY_TITLE } from '@/game/boosterDisplayNames.js'

/** @type {ShopOffer[]} */
export const SHOP_OFFERS = [
  {
    id: 'bomb_1',
    type: 'single',
    kind: 'bomb',
    qty: 1,
    price: 45,
    title: BOOSTER_DISPLAY_NAME.bomb,
    hint: 'Пиратский пончик: взрыв 3×3. В запас; при старте уровня с запаса на панель — до 8 за тип за раз. Бесплатные по 3 каждого типа на панели — один раз за игру при первом обычном уровне.',
  },
  {
    id: 'clock_1',
    type: 'single',
    kind: 'clock',
    qty: 1,
    price: 40,
    title: BOOSTER_DISPLAY_NAME.clock,
    hint: 'Маффин с лупой: откат хода или +3 хода, если откатывать нечего',
  },
  {
    id: 'star_1',
    type: 'single',
    kind: 'star',
    qty: 1,
    price: 55,
    title: BOOSTER_DISPLAY_NAME.star,
    hint: 'Круассан-ниндзя: убирает все фишки выбранного цвета с поля',
  },
  {
    id: 'bundle_small',
    type: 'bundle',
    price: 120,
    title: SHOP_BUNDLE_DISPLAY_TITLE,
    hint:
      'По +1 к запасу для Капитана Крюка, Сыщика Маффа и Круассюрикена. При старте следующего уровня часть запаса переносится на нижнюю панель (до 8 каждого типа за раз). Бесплатные по 3 каждого типа на панели выдаются один раз за игру при первом обычном уровне. В бою: нажми иконку бустера снизу — у Крюка и Круассюрикена потом выбери клетку на поле; у Сыщика Мафф эффект сразу после нажатия.',
    bundle: { bomb: 1, clock: 1, star: 1 },
  },
]
