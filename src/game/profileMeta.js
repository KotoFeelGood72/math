/**
 * Метаданные профиля: форматирование очков и список достижений.
 */

export function formatLeaderboardScore(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.max(0, n | 0))
}

/**
 * @param {object} s
 * @param {number} s.completedCount
 * @param {number} s.totalStars
 * @param {number} s.totalLevels
 * @param {number} s.coins
 * @param {number} s.totalMoves
 * @param {number} s.totalScore
 * @param {number} s.levelsWon
 * @param {number} s.longestCombo
 * @param {number} s.longestCascade
 * @param {number} s.specialsCreated
 * @param {number} s.rainbowsUsed
 */
export function buildAchievements(s) {
  const maxStars = Math.max(1, s.totalLevels) * 3

  const raw = [
    {
      id: 'a_first_level',
      title: 'Первый шаг',
      hint: 'Пройдите 1 уровень',
      current: s.completedCount,
      target: 1,
    },
    {
      id: 'a_five_levels',
      title: 'На кончиках пальцев',
      hint: 'Пройдите 5 уровней',
      current: s.completedCount,
      target: 5,
    },
    {
      id: 'a_ten_levels',
      title: 'Путь сладкоежки',
      hint: 'Пройдите 10 уровней',
      current: s.completedCount,
      target: 10,
    },
    {
      id: 'a_all_levels',
      title: 'Полный горизонт',
      hint: `Пройдите все ${s.totalLevels} уровней`,
      current: s.completedCount,
      target: s.totalLevels,
    },
    {
      id: 'a_stars_15',
      title: 'Звёздная пыль',
      hint: 'Соберите 15 звёзд',
      current: s.totalStars,
      target: 15,
    },
    {
      id: 'a_stars_half',
      title: 'Полсозвездия',
      hint: `Соберите ${Math.min(45, maxStars)} звёзд`,
      current: s.totalStars,
      target: Math.min(45, maxStars),
    },
    {
      id: 'a_stars_all',
      title: 'Идеальная сетка',
      hint: 'Соберите все звёзды во всех уровнях',
      current: s.totalStars,
      target: maxStars,
    },
    {
      id: 'a_coins',
      title: 'Копилка',
      hint: 'Накопите 500 монет',
      current: s.coins,
      target: 500,
    },
    {
      id: 'a_moves',
      title: 'Тактик',
      hint: 'Сделайте 500 ходов всего',
      current: s.totalMoves,
      target: 500,
    },
    {
      id: 'a_score',
      title: 'Очковый гром',
      hint: 'Наберите 25 000 очков всего',
      current: s.totalScore,
      target: 25_000,
    },
    {
      id: 'a_wins',
      title: 'Серия побед',
      hint: 'Одержите 10 побед на уровнях',
      current: s.levelsWon,
      target: 10,
    },
    {
      id: 'a_combo',
      title: 'Огненное комбо',
      hint: 'Достигните комбо из 5 элементов',
      current: s.longestCombo,
      target: 5,
    },
    {
      id: 'a_cascade',
      title: 'Каскадёр',
      hint: 'Соберите каскад из 5 совпадений',
      current: s.longestCascade,
      target: 5,
    },
    {
      id: 'a_specials',
      title: 'Алхимик фишек',
      hint: 'Создайте 25 усиленных фишек',
      current: s.specialsCreated,
      target: 25,
    },
    {
      id: 'a_rainbow',
      title: 'Радуга в ряду',
      hint: 'Используйте радужную фишку 5 раз',
      current: s.rainbowsUsed,
      target: 5,
    },
  ]

  return raw.map((item) => {
    const tgt = Math.max(1, item.target | 0)
    const cur = Math.max(0, item.current | 0)
    const done = cur >= tgt
    const percent = Math.min(100, Math.round((Math.min(cur, tgt) / tgt) * 100))
    return {
      ...item,
      current: cur,
      target: tgt,
      done,
      percent,
    }
  })
}
