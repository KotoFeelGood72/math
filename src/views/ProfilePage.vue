<template>
  <PhoneFrame :parallax="false">
    <div class="prof" data-allow-browser-scroll>
      <header class="prof__top">
        <button
          type="button"
          class="prof__back"
          aria-label="Назад"
          @click="goBack"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <h1 class="prof__title">Профиль</h1>
        <div class="prof__top-spacer" />
      </header>

      <div class="prof__sections">
        <section
          class="prof__hero m3-modal-panel"
          aria-label="Звёзды, уровни и монеты"
        >
            <div class="prof__hero-stars">
              <Icon class="prof__hero-star" icon="mdi:star" aria-hidden="true" />
              <span class="prof__hero-stars-num">{{ totalStars }}</span>
              <span class="prof__hero-stars-of">/ {{ totalLevels * 3 }}</span>
            </div>
            <p class="prof__hero-sub">
              Пройдено {{ completedCount }} из {{ totalLevels }} ·
              <span class="prof__hero-coins">
                <Icon class="prof__coin-icon" icon="mdi:cash" aria-hidden="true" />
                {{ coins }}
              </span>
            </p>
            <div class="prof__bar">
              <div
                class="prof__bar-fill"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
          </section>

        <section class="prof__panel m3-modal-panel" aria-labelledby="prof-lb-h">
            <h2 id="prof-lb-h" class="prof__panel-title">Таблица лидеров</h2>
            <p class="prof__rank-line">
              Ваше место:
              <strong class="prof__rank-num">{{ leaderboard.playerRank }}</strong>
              из {{ leaderboard.totalPlayers }}
              <span class="prof__rank-score">
                · {{ formatLeaderboardScore(leaderboard.playerScore) }} очков
              </span>
            </p>
            <div class="prof__table-wrap" role="region" aria-label="Топ по очкам">
              <table class="prof__lb-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Игрок</th>
                    <th scope="col">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in leaderboard.topRows"
                    :key="row.id"
                    :class="{ 'prof__lb-tr--me': row.isPlayer }"
                  >
                    <td>{{ row.rank }}</td>
                    <td>{{ row.name }}</td>
                    <td>{{ formatLeaderboardScore(row.score) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="prof__lb-note">
              Сравнение по сумме очков за всё время. Демо-список соперников; позже можно
              подключить общий рейтинг.
            </p>
          </section>

        <section class="prof__panel m3-modal-panel" aria-labelledby="prof-ach-h">
            <h2 id="prof-ach-h" class="prof__panel-title">Достижения</h2>
            <ul class="prof__ach-list">
              <li
                v-for="a in achievements"
                :key="a.id"
                class="prof__ach"
                :class="{ 'prof__ach--done': a.done }"
              >
                <div class="prof__ach-main">
                  <span class="prof__ach-title">{{ a.title }}</span>
                  <span class="prof__ach-hint">{{ a.hint }}</span>
                </div>
                <div class="prof__ach-track" role="presentation">
                  <div
                    class="prof__ach-fill"
                    :style="{ width: `${a.percent}%` }"
                  />
                </div>
                <div class="prof__ach-meta">
                  <span class="prof__ach-count">
                    {{ a.current }} / {{ a.target }}
                  </span>
                  <Icon
                    v-if="a.done"
                    class="prof__ach-check"
                    icon="mdi:check-decagram"
                    aria-label="Выполнено"
                  />
                </div>
              </li>
            </ul>
          </section>
      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'ProfilePage' })

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import { Icon } from '@iconify/vue'
import { useMatch3ProgressStore } from '@/stores/match3Progress'
import { useMatch3StatsStore } from '@/stores/match3Stats'
import { useYandexGamesStore } from '@/stores/yandexGames'
import {
  buildAchievements,
  buildLeaderboardTable,
  formatLeaderboardScore,
} from '@/game/profileMeta.js'

const router = useRouter()
const progress = useMatch3ProgressStore()
const stats = useMatch3StatsStore()
const yandexGames = useYandexGamesStore()
const {
  totalStars,
  completedCount,
  totalLevels,
  progressPercent,
  coins,
} = storeToRefs(progress)
const {
  totalMoves,
  totalScore,
  levelsWon,
  longestCombo,
  longestCascade,
  specialsCreated,
  rainbowsUsed,
} = storeToRefs(stats)

const playerLabel = ref('Вы')

const leaderboard = computed(() =>
  buildLeaderboardTable(playerLabel.value, totalScore.value),
)

const achievements = computed(() =>
  buildAchievements({
    completedCount: completedCount.value,
    totalStars: totalStars.value,
    totalLevels: totalLevels.value,
    coins: coins.value,
    totalMoves: totalMoves.value,
    totalScore: totalScore.value,
    levelsWon: levelsWon.value,
    longestCombo: longestCombo.value,
    longestCascade: longestCascade.value,
    specialsCreated: specialsCreated.value,
    rainbowsUsed: rainbowsUsed.value,
  }),
)

function goBack() {
  router.push({ name: 'menu' })
}

function onEscape(e) {
  if (e.key === 'Escape') goBack()
}

onMounted(async () => {
  window.addEventListener('keydown', onEscape)
  try {
    const p = await yandexGames.ensurePlayer()
    if (!p) return
    if (typeof p.getName === 'function') {
      const raw = await Promise.resolve(p.getName())
      const n = raw != null ? String(raw).trim() : ''
      if (n) {
        playerLabel.value = n.slice(0, 40)
      }
      return
    }
    if (typeof p.name === 'string' && p.name.trim()) {
      playerLabel.value = p.name.trim().slice(0, 40)
    }
  } catch {
    /* локальный запуск или нет прав — остаётся «Вы» */
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', onEscape))
</script>

<style scoped>
.prof {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: var(--m3-text);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Шапка — как на экране настроек */
.prof__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.35rem 0.45rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.7rem 0.45rem;
}

.prof__back {
  width: 2.4rem;
  height: 2.4rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
  color: #6e3911;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
}

.prof__back :deep(svg) {
  width: 1.12rem;
  height: 1.12rem;
}

.prof__back:active {
  transform: translateY(2px);
}

.prof__title {
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911,
    0 2px 0 rgba(110, 57, 17, 0.5);
  min-width: 0;
}

.prof__top-spacer {
  width: 2.4rem;
}

.prof__sections {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
  padding: 0.75rem 0.7rem max(0.85rem, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.prof__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding: 0.9rem 1rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.prof__hero-stars {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
}

.prof__hero-star {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--m3-star);
  filter: drop-shadow(0 1px 2px rgba(110, 57, 17, 0.35));
  transform: translateY(0.2rem);
}

.prof__hero-stars-num {
  font-size: 2rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #c67612;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.prof__hero-stars-of {
  font-size: 0.9rem;
  font-weight: 700;
  color: #6e3911;
  opacity: 0.88;
}

.prof__hero-sub {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 700;
  color: #4a2810;
  text-align: center;
  line-height: 1.45;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.prof__hero-coins {
  font-weight: 900;
  color: #2f7a28;
  margin-left: 0.15rem;
  display: inline-flex;
  align-items: baseline;
  gap: 0.22rem;
}

.prof__coin-icon {
  width: 1rem;
  height: 1rem;
  display: block;
}

.prof__bar {
  width: 100%;
  height: 0.55rem;
  border-radius: 999px;
  border: 2px solid rgba(74, 40, 16, 0.4);
  background: rgba(110, 57, 17, 0.12);
  overflow: hidden;
  margin-top: 0.15rem;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
}

.prof__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffd84a 0%, #5fae3e 60%, #2f8a25 100%);
  transition: width 0.3s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

/* Кремовые панели */
.prof__panel {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.85rem 1rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.prof__panel-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6e3911;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
}

.prof__rank-line {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: #4a2810;
  line-height: 1.4;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.prof__rank-num {
  color: #c67612;
  font-size: 1.05em;
}

.prof__rank-score {
  font-weight: 600;
  color: #6e3911;
  opacity: 0.9;
}

.prof__table-wrap {
  border-radius: 14px;
  border: 2px solid rgba(110, 57, 17, 0.28);
  overflow: hidden;
  background: rgba(255, 252, 245, 0.5);
}

.prof__lb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  color: #4a2810;
}

.prof__lb-table th,
.prof__lb-table td {
  padding: 0.45rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid rgba(110, 57, 17, 0.12);
}

.prof__lb-table th {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6e3911;
  background: rgba(255, 230, 190, 0.35);
}

.prof__lb-table td:last-child {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  text-align: right;
  color: #8a5a10;
}

.prof__lb-tr--me td {
  background: rgba(197, 232, 98, 0.28);
  font-weight: 800;
}

.prof__lb-note {
  margin: 0;
  font-size: 0.65rem;
  line-height: 1.45;
  color: #6e3911;
  opacity: 0.82;
}

.prof__ach-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.prof__ach {
  padding: 0.55rem 0.65rem 0.6rem;
  border-radius: 14px;
  border: 2px solid rgba(110, 57, 17, 0.22);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(230, 215, 185, 0.38) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.prof__ach--done {
  border-color: rgba(77, 142, 26, 0.45);
  background: linear-gradient(
    180deg,
    rgba(213, 248, 180, 0.55) 0%,
    rgba(180, 220, 140, 0.4) 100%
  );
}

.prof__ach-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.35rem;
}

.prof__ach-title {
  font-size: 0.86rem;
  font-weight: 800;
  color: #4a2810;
}

.prof__ach-hint {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6e3911;
  opacity: 0.88;
  line-height: 1.35;
}

.prof__ach-track {
  height: 0.38rem;
  border-radius: 999px;
  background: rgba(110, 57, 17, 0.15);
  overflow: hidden;
  margin-bottom: 0.35rem;
}

.prof__ach-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffd84a 0%, #5fae3e 85%, #2f8a25 100%);
  transition: width 0.35s ease;
}

.prof__ach-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.prof__ach-count {
  font-size: 0.72rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #8a5a10;
}

.prof__ach-check {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: #3d7a18;
}

.prof__ach-check :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
