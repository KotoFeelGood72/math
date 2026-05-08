/**
 * «Коллекция артефактов» — мета-цель: открывается по мере набора звёзд.
 * Каждый артефакт = шаг прогресса; чем дальше — тем больше звёзд нужно.
 */

export const ARTIFACTS = [
  { id: 'sword', icon: 'mdi:sword', name: 'Меч', threshold: 1 },
  { id: 'shield', icon: 'mdi:shield', name: 'Щит', threshold: 4 },
  { id: 'crown', icon: 'mdi:crown-outline', name: 'Корона', threshold: 14 },
  { id: 'gem', icon: 'mdi:diamond-stone', name: 'Алмаз', threshold: 21 },
  { id: 'key', icon: 'mdi:key', name: 'Ключ', threshold: 28 },
  { id: 'orb', icon: 'mdi:crystal-ball', name: 'Шар', threshold: 36 },
  { id: 'scroll', icon: 'mdi:script-text-outline', name: 'Свиток', threshold: 45 },
  { id: 'horn', icon: 'mdi:trumpet', name: 'Горн', threshold: 54 },
  { id: 'star', icon: 'mdi:star-four-points-outline', name: 'Звезда', threshold: 63 },
  { id: 'gift', icon: 'mdi:gift-outline', name: 'Дар', threshold: 72 },
  { id: 'amulet', icon: 'mdi:necklace', name: 'Амулет', threshold: 90 },
]

export function getUnlockedCount(totalStars) {
  let n = 0
  for (const a of ARTIFACTS) {
    if (totalStars >= a.threshold) n += 1
    else break
  }
  return n
}

export function getNextArtifact(totalStars) {
  for (const a of ARTIFACTS) {
    if (totalStars < a.threshold) return a
  }
  return null
}
