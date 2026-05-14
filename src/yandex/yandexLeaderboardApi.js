/**
 * Обёртки над `ysdk.leaderboards` (актуальный API Яндекс Игр).
 * @see https://yandex.ru/dev/games/doc/ru/sdk/sdk-leaderboard
 */

/**
 * @param {unknown} ysdk
 * @returns {boolean}
 */
export function hasLeaderboardsApi(ysdk) {
  return Boolean(
    ysdk &&
      typeof ysdk === 'object' &&
      ysdk.leaderboards &&
      typeof ysdk.leaderboards.getEntries === 'function',
  )
}

/**
 * @param {unknown} ysdk
 * @param {string} method — например `leaderboards.setScore`
 * @returns {Promise<boolean>}
 */
export async function isLeaderboardMethodAvailable(ysdk, method) {
  if (!ysdk || typeof ysdk.isAvailableMethod !== 'function') return false
  try {
    return Boolean(await ysdk.isAvailableMethod(method))
  } catch {
    return false
  }
}

/**
 * @param {import('ysdk').LeaderboardEntry} entry
 * @param {string} [myUniqueId]
 */
export function mapLeaderboardEntryToRow(entry, myUniqueId) {
  const uid = entry?.player?.uniqueID ?? ''
  const perms = entry?.player?.scopePermissions
  const nameHidden =
    perms &&
    typeof perms === 'object' &&
    perms.public_name === 'forbidden'
  const rawName =
    typeof entry?.player?.publicName === 'string'
      ? entry.player.publicName.trim()
      : ''
  const name = nameHidden
    ? 'Пользователь скрыт'
    : rawName || 'Игрок'
  const formatted =
    typeof entry?.formattedScore === 'string' && entry.formattedScore.trim()
      ? entry.formattedScore.trim()
      : ''
  return {
    id: uid || `lb-rank-${entry?.rank ?? 0}`,
    name,
    score: Math.max(0, Number(entry?.score) || 0),
    rank: Math.max(1, Number(entry?.rank) || 0),
    isPlayer: Boolean(myUniqueId && uid && myUniqueId === uid),
    formattedScore: formatted,
  }
}

/**
 * @param {import('ysdk').SDK} ysdk
 * @param {string} leaderboardName
 * @param {{ quantityTop?: number; includeUser?: boolean; quantityAround?: number }} [opts]
 * @returns {Promise<import('ysdk').LeaderboardEntriesData | null>}
 */
export async function fetchLeaderboardEntries(ysdk, leaderboardName, opts) {
  if (!hasLeaderboardsApi(ysdk) || !leaderboardName) return null
  try {
    return await ysdk.leaderboards.getEntries(leaderboardName, {
      quantityTop: 10,
      includeUser: true,
      quantityAround: 3,
      ...opts,
    })
  } catch (err) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Avia][yandex] leaderboards.getEntries', err)
    }
    return null
  }
}

/**
 * @param {import('ysdk').SDK} ysdk
 * @param {string} leaderboardName
 * @returns {Promise<import('ysdk').LeaderboardEntry | null>}
 */
export async function fetchPlayerLeaderboardEntry(ysdk, leaderboardName) {
  if (!hasLeaderboardsApi(ysdk) || !leaderboardName) return null
  const ok = await isLeaderboardMethodAvailable(
    ysdk,
    'leaderboards.getPlayerEntry',
  )
  if (!ok) return null
  try {
    return await ysdk.leaderboards.getPlayerEntry(leaderboardName)
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String(err.code)
        : ''
    if (code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
      return null
    }
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Avia][yandex] leaderboards.getPlayerEntry', err)
    }
    return null
  }
}

/**
 * @param {import('ysdk').SDK} ysdk
 * @param {string} leaderboardName
 * @param {number} score
 * @param {string} [extraData]
 * @returns {Promise<boolean>} — `true`, если запрос ушёл без ошибки
 */
export async function submitLeaderboardScore(
  ysdk,
  leaderboardName,
  score,
  extraData,
) {
  if (!hasLeaderboardsApi(ysdk) || !leaderboardName) return false
  const ok = await isLeaderboardMethodAvailable(ysdk, 'leaderboards.setScore')
  if (!ok) return false
  const v = Math.max(0, Math.floor(Number(score) || 0))
  try {
    if (extraData != null && extraData !== '') {
      await ysdk.leaderboards.setScore(leaderboardName, v, String(extraData))
    } else {
      await ysdk.leaderboards.setScore(leaderboardName, v)
    }
    return true
  } catch (err) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[Avia][yandex] leaderboards.setScore', err)
    }
    return false
  }
}
