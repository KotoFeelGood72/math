/**
 * Техническое имя лидерборда из консоли Яндекс Игр (поле «Техническое название лидерборда»).
 * По умолчанию — `match3totalscore` (должно совпадать с консолью).
 * Переопределение: `.env` → `VITE_YANDEX_LEADERBOARD_NAME=другое_имя`
 * @see https://yandex.ru/dev/games/doc/ru/sdk/sdk-leaderboard
 */
const DEFAULT_LEADERBOARD_NAME = 'match3totalscore'

export function getYandexLeaderboardName() {
  const raw = import.meta.env.VITE_YANDEX_LEADERBOARD_NAME
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return DEFAULT_LEADERBOARD_NAME
}
