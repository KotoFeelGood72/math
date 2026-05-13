/**
 * Отображаемые «клички» бустеров (магазин, HUD, справка).
 * Внутренняя логика по-прежнему: bomb / clock / star.
 */

/** @type {Record<'bomb' | 'clock' | 'star', string>} */
export const BOOSTER_DISPLAY_NAME = {
  bomb: 'Капитан Крюк',
  clock: 'Сыщик Мафф',
  star: 'Круассюрикен',
}

/** Набор из трёх бустеров в магазине */
export const SHOP_BUNDLE_DISPLAY_TITLE = 'Трио «Три удара»'
