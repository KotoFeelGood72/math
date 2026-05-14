/**
 * Техническое имя лидерборда из консоли Яндекс Игр (поле «Техническое название лидерборда»).
 * Задаётся в `.env`: `VITE_YANDEX_LEADERBOARD_NAME=your_lb_id`
 * @see https://yandex.ru/dev/games/doc/ru/sdk/sdk-leaderboard
 */
export function getYandexLeaderboardName() {
  const raw = import.meta.env.VITE_YANDEX_LEADERBOARD_NAME
  if (typeof raw !== 'string') return ''
  const t = raw.trim()
  return t
}
