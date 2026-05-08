/**
 * PNG-иконки фишек на доске (`src/assets/images/ico/`).
 * Один источник правды для Match3Cell и HUD целей.
 */

/** Индекс цвета палитры (0..5) → номер файла .png */
export const CHIP_ICON_NUM_BY_COLOR_INDEX = [11, 10, 6, 8, 3, 7]

export const RAINBOW_CHIP_ICON_NUM = 9

/** Картинка-обложка камня, закрывающего фишку. */
export const STONE_ICON_NUM = 4

/**
 * Иконки панели бустеров на экране игры: бомба, часы, звезда.
 * @param {'bomb' | 'clock' | 'star'} kind
 */
export function getBoosterIconUrl(kind) {
  const num =
    kind === 'bomb' ? 19 : kind === 'clock' ? 18 : 16
  try {
    return new URL(`../assets/images/ico/${num}.png`, import.meta.url).href
  } catch {
    return null
  }
}

/**
 * @param {number} colorIndex — индекс в COLOR_PALETTE / цвет на доске
 * @returns {string | null}
 */
export function getBoardChipIconUrl(colorIndex) {
  const n = CHIP_ICON_NUM_BY_COLOR_INDEX[colorIndex | 0]
  if (n == null) return null
  try {
    return new URL(`../assets/images/ico/${n}.png`, import.meta.url).href
  } catch {
    return null
  }
}

/** @returns {string | null} */
export function getStoneIconUrl() {
  try {
    return new URL(
      `../assets/images/ico/${STONE_ICON_NUM}.png`,
      import.meta.url,
    ).href
  } catch {
    return null
  }
}

/** @returns {string | null} */
export function getRainbowChipIconUrl() {
  try {
    return new URL(
      `../assets/images/ico/${RAINBOW_CHIP_ICON_NUM}.png`,
      import.meta.url,
    ).href
  } catch {
    return null
  }
}
