<template>
  <PhoneFrame :parallax="false">
    <div ref="playRootRef" class="play">
      <header class="play__top">
        <div class="play__top-left">
          <button
            type="button"
            class="play__back"
            :disabled="status !== 'playing'"
            aria-label="Пауза"
            @click="openPause"
          >
            <Icon icon="mdi:pause" />
          </button>
        </div>
        <div class="play__lvl">
          Уровень <strong>{{ levelId }}</strong>
        </div>
        <div class="play__top-stats">
          <span
            ref="movesPillRef"
            class="m3-top-pill play__top-pill"
            :class="{ 'play__top-pill--low': movesLeft <= 3 }"
            :title="`Ходы: ${movesLeft}`"
          >
            <span class="m3-top-pill__icon m3-top-pill__icon--energy" aria-hidden="true">
              <Icon icon="mdi:foot-print" />
            </span>
            {{ movesLeft }}
          </span>
          <span
            ref="scoreTargetRef"
            class="m3-top-pill play__top-pill"
            :title="`Очки: ${score}`"
          >
            <span class="m3-top-pill__icon m3-top-pill__icon--star" aria-hidden="true">
              <Icon icon="mdi:star" />
            </span>
            {{ score }}
          </span>
        </div>
      </header>

      <section class="play__hud">
        <div
          ref="goalsCardRef"
          class="play__hud-card play__hud-card--goals"
        >
          <div
            v-if="boosterNeedsBoardTap"
            class="play__goals-booster-hint"
            role="status"
            aria-live="polite"
            :title="boosterAimHintText"
          >
            <p class="play__goals-booster-hint-text">
              {{ boosterAimHintText }}
            </p>
          </div>
          <div v-else class="play__goals-stack">
            <div class="play__goals-top">
              <span class="play__hud-label play__hud-label--goals-title">Цели</span>
              <div
                class="play__goals-row"
                :class="{ 'play__goals-row--spread': stoneProgress.target > 0 }"
                role="list"
              >
                <div
                  v-if="stoneProgress.target > 0"
                  class="play__goal-item"
                  role="listitem"
                  title="Камни"
                >
                  <img
                    v-if="stoneGoalIconUrl"
                    :src="stoneGoalIconUrl"
                    class="play__goal-icon play__goal-icon--stone-img"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                  />
                  <span class="play__goal-count">
                    {{ stoneProgress.broken }} / {{ stoneProgress.target }}
                  </span>
                </div>
                <div
                  class="play__goal-item"
                  role="listitem"
                  title="Цель уровня"
                >
                  <img
                    v-if="objective?.type === 'collect' && collectGoalIconUrl"
                    class="play__chip play__chip--goal-inline"
                    :src="collectGoalIconUrl"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                  />
                  <span v-else-if="objective?.type === 'score'" aria-hidden="true">
                    <Icon icon="mdi:star" class="play__goal-icon play__goal-icon--score" />
                  </span>
                  <span class="play__goal-count">{{ progressText }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="play__board-wrap">
        <div
          v-if="boosterFxKind"
          class="play__booster-flash"
          aria-hidden="true"
        >
          <img
            :src="boosterFxIconSrc"
            alt=""
            class="play__booster-flash-icon"
            draggable="false"
          />
        </div>
        <Match3Board
          v-if="board.length"
          ref="boardRef"
          :board="board"
          :stone-hp="stoneHp"
          :selected="selected"
          :matched-keys="matchedKeys"
          :clear-fx="clearFx"
          :spawned-keys="spawnedKeys"
          :disabled="isBusy || status !== 'playing' || paused || tutorialBoardLocked"
          :hint-cell-key="hintCellKey"
          :tutorial-from-key="tutorialCellFromKey"
          :tutorial-to-key="tutorialCellToKey"
          :booster-aim="boosterNeedsBoardTap"
          @tap="onTap"
          @swipe="onSwipe"
        />
      </section>

      <div
        v-if="tutorialActive && !tutorialHudTourActive"
        class="m3-tutorial"
        :class="{ 'm3-tutorial--swap': tutorialStep === 'swap' }"
        role="dialog"
        aria-modal="true"
        aria-label="Обучение"
        @pointerdown.stop
        @click.stop
      >
        <div
          v-if="tutorialDimLayerStyle"
          class="m3-tutorial__dim"
          :style="tutorialDimLayerStyle"
          aria-hidden="true"
        />
        <div
          v-if="tutorialFromStyle"
          class="m3-tutorial__ring m3-tutorial__ring--from"
          :style="tutorialFromStyle"
          aria-hidden="true"
        />
        <div
          v-if="tutorialToStyle"
          class="m3-tutorial__ring m3-tutorial__ring--to"
          :style="tutorialToStyle"
          aria-hidden="true"
        />
        <div
          v-if="tutorialArrowStyle"
          class="m3-tutorial__swipe"
          :style="tutorialArrowStyle"
          aria-hidden="true"
        >
          <div class="m3-tutorial__swipe-line" />
          <div class="m3-tutorial__swipe-head" />
        </div>

        <!-- HUD-часть обучения ведёт Driver.js -->
      </div>

      <div ref="boostRowRef" class="play__boost-row" role="toolbar" aria-label="Усилители">
        <button
          type="button"
          class="play__boost-btn"
          :class="{ 'play__boost-btn--on': boosterPick === 'bomb' }"
          :disabled="boostBarDisabled"
          :title="
            boosterBomb > 0
              ? `${BOOSTER_DISPLAY_NAME.bomb} — взрыв 3×3, нажмите и выберите клетку`
              : 'Посмотреть рекламу и получить бустер'
          "
          :aria-label="
            boosterBomb > 0
              ? `${BOOSTER_DISPLAY_NAME.bomb}, зарядов ${boosterBomb}`
              : `${BOOSTER_DISPLAY_NAME.bomb} закончился — получить за рекламу`
          "
          @click="selectBooster('bomb')"
        >
          <span v-if="boosterBomb > 0" class="play__boost-count">{{ boosterBomb }}</span>
          <Icon
            v-else
            icon="mdi:movie-open-play"
            class="play__boost-ad-ico"
            aria-hidden="true"
          />
          <img
            v-if="boosterIconBomb"
            :src="boosterIconBomb"
            class="play__boost-ico"
            alt=""
            draggable="false"
          />
        </button>
        <button
          type="button"
          class="play__boost-btn"
          :disabled="boostBarDisabled"
          :title="
            boosterClock > 0
              ? `${BOOSTER_DISPLAY_NAME.clock} — откат хода или доп. ходы`
              : 'Посмотреть рекламу и получить бустер'
          "
          :aria-label="
            boosterClock > 0
              ? `${BOOSTER_DISPLAY_NAME.clock}, зарядов ${boosterClock}`
              : `${BOOSTER_DISPLAY_NAME.clock} закончился — получить за рекламу`
          "
          @click="selectBooster('clock')"
        >
          <span v-if="boosterClock > 0" class="play__boost-count">{{ boosterClock }}</span>
          <Icon
            v-else
            icon="mdi:movie-open-play"
            class="play__boost-ad-ico"
            aria-hidden="true"
          />
          <img
            v-if="boosterIconClock"
            :src="boosterIconClock"
            class="play__boost-ico"
            alt=""
            draggable="false"
          />
        </button>
        <button
          type="button"
          class="play__boost-btn"
          :class="{ 'play__boost-btn--on': boosterPick === 'star' }"
          :disabled="boostBarDisabled"
          :title="
            boosterStar > 0
              ? `${BOOSTER_DISPLAY_NAME.star} — убрать все фишки цвета, нажмите и выберите клетку`
              : 'Посмотреть рекламу и получить бустер'
          "
          :aria-label="
            boosterStar > 0
              ? `${BOOSTER_DISPLAY_NAME.star}, зарядов ${boosterStar}`
              : `${BOOSTER_DISPLAY_NAME.star} закончился — получить за рекламу`
          "
          @click="selectBooster('star')"
        >
          <span v-if="boosterStar > 0" class="play__boost-count">{{ boosterStar }}</span>
          <Icon
            v-else
            icon="mdi:movie-open-play"
            class="play__boost-ad-ico"
            aria-hidden="true"
          />
          <img
            v-if="boosterIconStar"
            :src="boosterIconStar"
            class="play__boost-ico"
            alt=""
            draggable="false"
          />
        </button>
        <button
          type="button"
          class="play__boost-btn play__boost-btn--ad"
          :disabled="boostBarDisabled"
          title="Реклама — после просмотра +5 ходов"
          aria-label="Посмотреть рекламу за дополнительные ходы"
          @click="watchRewardedForMoves"
        >
          <Icon
            icon="mdi:movie-open-play"
            class="play__boost-ico play__boost-ico--svg"
            aria-hidden="true"
          />
        </button>
      </div>

      <RewardPopup ref="rewardPopupRef" />

      <Teleport to="body">
        <div
          v-if="flyCoins.length > 0"
          class="play__fly-layer"
          aria-hidden="true"
        >
          <div
            v-for="c in flyCoins"
            :key="c.id"
            class="play__fly-coin"
            :style="{
              left: `${c.x0}px`,
              top: `${c.y0}px`,
              '--dx': `${c.x1 - c.x0}px`,
              '--dy': `${c.y1 - c.y0}px`,
              animationDelay: `${c.delay}ms`,
            }"
          >
            <Icon icon="mdi:cash" class="play__fly-coin__icon" />
          </div>
        </div>
      </Teleport>

      <div
        v-if="paused && status === 'playing'"
        class="m3-modal-overlay play__pause-scrim"
        role="presentation"
      >
        <div
          class="m3-modal-panel play__pause-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-pause-title"
          @click.stop
        >
          <span id="play-pause-title" class="m3-ribbon play__pause-ribbon">
            <span class="m3-ribbon__line">Пауза</span>
          </span>
          <p class="play__pause-sub">Уровень {{ levelId }}</p>
          <div class="m3-modal-actions play__pause-actions">
            <button
              type="button"
              class="m3-round-icon-btn"
              aria-label="В меню"
              @click="exitFromPauseToMenu"
            >
              <Icon icon="mdi:menu" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="m3-round-icon-btn m3-round-icon-btn--green"
              aria-label="Продолжить игру"
              @click="closePause"
            >
              <Icon icon="mdi:play" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="status === 'no_moves'"
        class="m3-modal-overlay play__no-moves-scrim"
        role="presentation"
      >
        <div
          class="m3-modal-panel play__no-moves-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-no-moves-title"
          @click.stop
        >
          <span id="play-no-moves-title" class="m3-ribbon play__no-moves-ribbon">
            <span class="m3-ribbon__line">Нет ходов</span>
          </span>
          <p class="play__no-moves-lead">
            {{ noMovesLeadText }}
          </p>
          <div class="play__no-moves-actions">
            <MenuActionButton
              v-if="!noMovesFreeShuffleUsed"
              variant="hero"
              class="play__no-moves-btn"
              :disabled="noMovesActionBusy || noMovesAdBusy"
              @click="onNoMovesShuffleFree"
            >
              Перемешать
            </MenuActionButton>
            <MenuActionButton
              variant="hero"
              class="play__no-moves-btn play__no-moves-btn--coins"
              :disabled="
                noMovesActionBusy ||
                noMovesAdBusy ||
                coins < NO_MOVES_SHUFFLE_COIN_COST
              "
              @click="onNoMovesShuffleForCoins"
            >
              За {{ NO_MOVES_SHUFFLE_COIN_COST }} монет
            </MenuActionButton>
            <MenuActionButton
              variant="hero"
              class="play__no-moves-btn play__no-moves-btn--ad"
              :disabled="noMovesActionBusy || noMovesAdBusy"
              @click="watchNoMovesRewardedAd"
            >
              Реклама · +{{ REWARD_MOVES_FROM_AD }} ходов
            </MenuActionButton>
            <button
              type="button"
              class="play__no-moves-surrender"
              :disabled="noMovesActionBusy || noMovesAdBusy"
              @click="onNoMovesSurrender"
            >
              Сдаться
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="lossModalVisible && status === 'lost'"
        class="m3-modal-overlay play__loss-scrim"
        role="presentation"
      >
        <div
          class="m3-modal-panel play__loss-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-loss-title"
          @click.stop
        >
          <span id="play-loss-title" class="m3-ribbon play__loss-ribbon">
            <span class="m3-ribbon__line">Ходы закончились</span>
          </span>
          <p class="play__loss-lead">
            Посмотрите рекламу и получите
            <strong>+{{ REWARD_MOVES_FROM_AD }} ходов</strong>, чтобы продолжить уровень.
          </p>
          <MenuActionButton
            variant="hero"
            class="play__loss-ad-btn"
            :disabled="lossAdBusy"
            @click="watchAdContinueAfterLoss"
          >
            Реклама · +{{ REWARD_MOVES_FROM_AD }} ходов
          </MenuActionButton>
          <button
            type="button"
            class="play__loss-skip"
            :disabled="lossAdBusy"
            @click="finishLossToResult"
          >
            К результату без продолжения
          </button>
        </div>
      </div>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'Match3GamePage' })

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import PhoneFrame from '@/components/PhoneFrame.vue'
import Match3Board from '@/components/match3/Match3Board.vue'
import MenuActionButton from '@/components/MenuActionButton.vue'
import RewardPopup from '@/components/RewardPopup.vue'
import { Icon } from '@iconify/vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { getBoardChipIconUrl, getBoosterIconUrl, getStoneIconUrl } from '@/game/chipIcons.js'
import { BOOSTER_DISPLAY_NAME } from '@/game/boosterDisplayNames.js'
import { findHintSwap } from '@/game/match3Engine.js'
import {
  getColor,
  NO_MOVES_SHUFFLE_COIN_COST,
  useMatch3GameStore,
} from '@/stores/match3Game'
import { useMatch3ProgressStore } from '@/stores/match3Progress'
import { useYandexGamesStore } from '@/stores/yandexGames'
import { useAudioSettingsStore } from '@/stores/audioSettings'
import {
  playBoardMatchBreakSfx,
  playGameOverSfx,
  playSuccessSfx,
} from '@/audio/boardEffects.js'
import {
  pauseBackgroundMusic,
  playBackgroundMusic,
  resumeBackgroundMusicFromUserGesture,
} from '@/audio/backgroundMusic.js'

const route = useRoute()
const router = useRouter()
const game = useMatch3GameStore()
const progress = useMatch3ProgressStore()
const { coins } = storeToRefs(progress)
const yandexGames = useYandexGamesStore()
const audioSettings = useAudioSettingsStore()

const boardRef = ref(null)
const playRootRef = ref(null)
const goalsCardRef = ref(null)
const movesPillRef = ref(null)
const boostRowRef = ref(null)
const scoreTargetRef = ref(null)
/** @type {import('vue').Ref<{ id: number, x0: number, y0: number, x1: number, y1: number, delay: number }[]>} */
const flyCoins = ref([])
let flyCoinSeq = 0

const paused = ref(false)

const {
  board,
  stoneHp,
  selected,
  score,
  movesLeft,
  status,
  lostReason,
  stars,
  coinsEarned,
  objective,
  matchedKeys,
  clearFx,
  spawnedKeys,
  isBusy,
  stoneProgress,
  boosterBomb,
  boosterClock,
  boosterStar,
  lastUserSwap,
  noMovesFreeShuffleUsed,
} = storeToRefs(game)

const noMovesLeadText = computed(() =>
  noMovesFreeShuffleUsed.value
    ? 'Бесплатное перемешивание уже использовано. За монеты, рекламу или сдаться.'
    : 'Выберите действие: бесплатное перемешивание (один раз за уровень), за монеты, бонус за рекламу или сдаться.',
)

const tutorialActive = computed(() => progress.needsTutorial && levelId.value === 1)
const tutorialExpected = { r: 2, c: 1, dr: 0, dc: 1 }

const tutorialHudTourActive = ref(false)
const tutorialSwapTourActive = ref(false)
const tutorialStep = ref(/** @type {'swap'} */ ('swap'))
const tutorialBoardLocked = computed(() => tutorialActive.value && (tutorialHudTourActive.value || tutorialStep.value !== 'swap'))

const tutorialCellFromKey = computed(() =>
  tutorialActive.value && tutorialStep.value === 'swap'
    ? `${tutorialExpected.r},${tutorialExpected.c}`
    : '',
)
const tutorialCellToKey = computed(() =>
  tutorialActive.value && tutorialStep.value === 'swap'
    ? `${tutorialExpected.r + tutorialExpected.dr},${tutorialExpected.c + tutorialExpected.dc}`
    : '',
)

const tutorialFromStyle = ref(null)
const tutorialToStyle = ref(null)
const tutorialHintStyle = ref(null)
const tutorialArrowStyle = ref(null)
/** Одно затемнение с маской: «окно» на всю сетку (см. makeTutorialDimLayerStyle). */
const tutorialDimLayerStyle = ref(null)
let hudTour = null
let swapTour = null

function startHudTourIfNeeded() {
  if (!tutorialActive.value) return
  if (tutorialHudTourActive.value) return
  // На всякий случай: не держим одновременно 2 тура.
  try {
    swapTour?.destroy?.()
  } catch {
    /* ignore */
  }
  swapTour = null
  tutorialSwapTourActive.value = false

  const goalsEl = goalsCardRef.value
  const movesEl = movesPillRef.value
  const boostEl = boostRowRef.value
  if (!goalsEl || !movesEl || !boostEl) return

  tutorialHudTourActive.value = true
  hudTour = driver({
    allowClose: false,
    showProgress: false,
    disableActiveInteraction: true,
    overlayOpacity: 0.22,
    stagePadding: 10,
    nextBtnText: 'Далее',
    prevBtnText: 'Назад',
    doneBtnText: 'Начать',
    onDestroyed: () => {
      tutorialHudTourActive.value = false
      hudTour = null
      // После HUD-тура включаем шаг свайпа.
      void nextTick(() => startSwapTourIfNeeded())
      void updateTutorialUi()
    },
  })

  hudTour.setSteps([
    {
      element: goalsEl,
      popover: {
        title: 'Цели',
        description: 'Смотри, что нужно сделать на уровне.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: movesEl,
      popover: {
        title: 'Ходы',
        description: 'Количество ходов ограничено.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: boostEl,
      popover: {
        title: 'Усилители',
        description:
          'Нажми на усилитель, затем выбери клетку на поле.\n' +
          `${BOOSTER_DISPLAY_NAME.bomb} — взрыв 3×3. ${BOOSTER_DISPLAY_NAME.star} — убирает все фишки выбранного цвета.\n` +
          `${BOOSTER_DISPLAY_NAME.clock} — откат хода или +ходы, если откатывать нечего.`,
        side: 'top',
        align: 'center',
      },
    },
  ])

  hudTour.drive()
}

function startSwapTourIfNeeded() {
  if (!tutorialActive.value) return
  if (tutorialSwapTourActive.value) return
  if (tutorialHudTourActive.value) return
  const fromKey = `${tutorialExpected.r},${tutorialExpected.c}`
  // element должен существовать в DOM (ищем внутри фрейма)
  const root = playRootRef.value
  const el = root?.querySelector?.(`[data-m3-cell="${fromKey}"]`)
  if (!el) return

  tutorialSwapTourActive.value = true
  swapTour = driver({
    allowClose: false,
    showProgress: false,
    showButtons: ['done'],
    disableActiveInteraction: false,
    /** Без fade оверлея — иначе кадр с непрозрачным слоём может на миг затемнить поле. */
    animate: false,
    /** Своё затемнение вне поля — иконки доски не должны быть под оверлеем Driver. */
    overlayOpacity: 0,
    stagePadding: 8,
    prevBtnText: 'Назад',
    doneBtnText: 'Понял',
    onDestroyed: () => {
      tutorialSwapTourActive.value = false
      swapTour = null
    },
  })

  swapTour.setSteps([
    {
      element: el,
      popover: {
        title: 'Свайп',
        description: 'Проведи фишку вправо, чтобы собрать тройку.',
        side: 'top',
        align: 'center',
      },
    },
  ])
  swapTour.drive()
}

const TUTORIAL_DIM_ALPHA = 0.28

/**
 * Окно в маске затемнения (чёрный в SVG = не затемнять). rx — скругление «капсулы».
 * @typedef {{ x: number, y: number, w: number, h: number, rx?: number }} TutorialDimHole
 */

/**
 * Маска на весь экран: белое = затемнение, чёрные прямоугольники = «окна» без затемнения.
 * @param {number} rw
 * @param {number} rh
 * @param {TutorialDimHole[]} holes
 */
function makeTutorialDimLayerStyle(rw, rh, holes) {
  if (!(rw > 0) || !(rh > 0) || !holes?.length) return null
  const rects = holes
    .filter((h) => h.w > 0 && h.h > 0)
    .map((h) => {
      const rx =
        typeof h.rx === 'number'
          ? h.rx
          : Math.min(18, h.w / 2, h.h / 2)
      return `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="${rx}" fill="black"/>`
    })
    .join('')
  if (!rects) return null
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rw}" height="${rh}"><rect width="100%" height="100%" fill="white"/>${rects}</svg>`
  const url = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
  return {
    background: `rgba(0, 0, 0, ${TUTORIAL_DIM_ALPHA})`,
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: '0 0',
    maskPosition: '0 0',
  }
}

/** Прямоугольник элемента в координатах корня `.play` + отступ; rx по умолчанию — «капсула». */
function getTutorialDimHoleForElement(el, rootRect, pad, rxCapsule) {
  if (!el?.getBoundingClientRect || !rootRect) return null
  const r = el.getBoundingClientRect()
  const hl = Math.max(0, r.left - rootRect.left - pad)
  const ht = Math.max(0, r.top - rootRect.top - pad)
  const hr = Math.min(rootRect.width, r.right - rootRect.left + pad)
  const hb = Math.min(rootRect.height, r.bottom - rootRect.top + pad)
  const w = Math.max(0, hr - hl)
  const h = Math.max(0, hb - ht)
  if (!(w > 0) || !(h > 0)) return null
  const rx =
    typeof rxCapsule === 'number'
      ? rxCapsule
      : Math.min(w / 2, h / 2, 26)
  return { x: hl, y: ht, w, h, rx }
}

async function updateTutorialUi() {
  if (!tutorialActive.value) {
    tutorialFromStyle.value = null
    tutorialToStyle.value = null
    tutorialHintStyle.value = null
    tutorialArrowStyle.value = null
    tutorialDimLayerStyle.value = null
    return
  }
  await nextTick()
  const b = boardRef.value
  if (!b?.getCellCenterScreen) return
  const root = playRootRef.value
  const rootRect = root?.getBoundingClientRect?.()
  if (!rootRect) return
  // Сброс
  tutorialFromStyle.value = null
  tutorialToStyle.value = null
  tutorialArrowStyle.value = null
  tutorialDimLayerStyle.value = null
  // Пока идёт HUD-тур (Driver.js) — наш оверлей по клеткам не показываем.
  if (tutorialHudTourActive.value) return

  // swap step
  const from = b.getCellCenterScreen(tutorialExpected.r, tutorialExpected.c)
  const to = b.getCellCenterScreen(
    tutorialExpected.r + tutorialExpected.dr,
    tutorialExpected.c + tutorialExpected.dc,
  )
  if (!from || !to) return
  const fx = from.x - rootRect.left
  const fy = from.y - rootRect.top
  const tx = to.x - rootRect.left
  const ty = to.y - rootRect.top
  const ringSize = Math.max(from.w, from.h) * 0.92
  const dx = tx - fx
  const dy = ty - fy
  const len = Math.max(18, Math.hypot(dx, dy) - ringSize * 0.55)
  const ang = Math.atan2(dy, dx) * (180 / Math.PI)
  tutorialArrowStyle.value = {
    left: `${fx}px`,
    top: `${fy}px`,
    width: `${len}px`,
    transform: `translateY(-50%) rotate(${ang}deg)`,
    transformOrigin: '0 50%',
  }
  tutorialFromStyle.value = {
    left: `${fx - ringSize / 2}px`,
    top: `${fy - ringSize / 2}px`,
    width: `${ringSize}px`,
    height: `${ringSize}px`,
  }
  tutorialToStyle.value = {
    left: `${tx - ringSize / 2}px`,
    top: `${ty - ringSize / 2}px`,
    width: `${ringSize}px`,
    height: `${ringSize}px`,
  }
  /** «Окна» в затемнении: вся сетка (матчи) + карточка «Цели» капсулой, как на HUD. */
  const holes = []
  const grid = b.getBoardGridScreenRect?.() ?? null
  const gridPad = 4
  if (grid && grid.width > 0 && grid.height > 0) {
    const hl = Math.max(0, grid.left - rootRect.left - gridPad)
    const ht = Math.max(0, grid.top - rootRect.top - gridPad)
    const hr = Math.min(
      rootRect.width,
      grid.left - rootRect.left + grid.width + gridPad,
    )
    const hb = Math.min(
      rootRect.height,
      grid.top - rootRect.top + grid.height + gridPad,
    )
    const hw = Math.max(0, hr - hl)
    const hh = Math.max(0, hb - ht)
    if (hw > 0 && hh > 0) {
      holes.push({ x: hl, y: ht, w: hw, h: hh, rx: 18 })
    }
  }

  const goalsHole = getTutorialDimHoleForElement(goalsCardRef.value, rootRect, 8)
  if (goalsHole) holes.push(goalsHole)

  tutorialDimLayerStyle.value =
    holes.length > 0
      ? makeTutorialDimLayerStyle(rootRect.width, rootRect.height, holes)
      : null
}

const boosterIconBomb = computed(() => getBoosterIconUrl('bomb'))
const boosterIconClock = computed(() => getBoosterIconUrl('clock'))
const boosterIconStar = computed(() => getBoosterIconUrl('star'))

/** Краткая анимация иконки бустера по центру доски при применении */
const boosterFxKind = ref(/** @type {null | 'bomb' | 'clock' | 'star'} */ (null))
let boosterFxClearTimer = 0

const boosterFxIconSrc = computed(() => {
  const k = boosterFxKind.value
  if (k === 'bomb') return boosterIconBomb.value
  if (k === 'clock') return boosterIconClock.value
  if (k === 'star') return boosterIconStar.value
  return ''
})

function flashBoosterFx(/** @type {'bomb' | 'clock' | 'star'} */ kind) {
  boosterFxKind.value = kind
  if (boosterFxClearTimer) {
    clearTimeout(boosterFxClearTimer)
    boosterFxClearTimer = 0
  }
  boosterFxClearTimer = window.setTimeout(() => {
    boosterFxKind.value = null
    boosterFxClearTimer = 0
  }, 560)
}
const stoneGoalIconUrl = computed(() => getStoneIconUrl())

/** Выбор бомбы/звезды — следующий тап по полю применяет бустер */
const boosterPick = ref(/** @type {null | 'bomb' | 'star'} */ (null))
/** Ожидаем тап по клетке для бомбы/звезды — подсветка поля и подсказка */
const boosterNeedsBoardTap = computed(
  () => boosterPick.value === 'bomb' || boosterPick.value === 'star',
)
const boosterAimHintText = computed(() => {
  if (boosterPick.value === 'bomb') {
    return `${BOOSTER_DISPLAY_NAME.bomb}: нажмите на клетку — взрыв 3×3`
  }
  if (boosterPick.value === 'star') {
    return `${BOOSTER_DISPLAY_NAME.star}: нажмите на фишку — уберётся весь цвет`
  }
  return ''
})
/** Пока открыта rewarded — блокируем повторный тап */
const rewardAdBusy = ref(false)

const boostBarDisabled = computed(
  () =>
    status.value !== 'playing' ||
    paused.value ||
    isBusy.value ||
    rewardAdBusy.value ||
    tutorialActive.value,
)

/** Ходы за просмотр rewarded (Яндекс.Игры). */
const REWARD_MOVES_FROM_AD = 5

/** Центровой попап «получена награда» с конфетти; скрывается через 500мс. */
const rewardPopupRef = ref(null)

function showRewardForMoves(amount) {
  rewardPopupRef.value?.show({
    title: `+${amount} ходов`,
    icon: 'mdi:foot-print',
  })
}

function showRewardForBooster(kind) {
  rewardPopupRef.value?.show({
    title: `+1 ${BOOSTER_DISPLAY_NAME[kind] || 'бустер'}`,
    imageUrl: getBoosterIconUrl(kind),
  })
}

const lossModalVisible = ref(false)
const lossAdBusy = ref(false)
const noMovesActionBusy = ref(false)
const noMovesAdBusy = ref(false)

/** Подсказка: после 30 с бездействия — ключ ячейки "r,c" для покачивания фишки. */
const HINT_IDLE_MS = 30_000
const hintCellKey = ref('')
let idleHintTimer = 0

function clearIdleHintTimer() {
  if (idleHintTimer) {
    clearTimeout(idleHintTimer)
    idleHintTimer = 0
  }
}

function scheduleIdleHint() {
  clearIdleHintTimer()
  hintCellKey.value = ''
  if (status.value !== 'playing' || paused.value || isBusy.value) return
  idleHintTimer = window.setTimeout(() => {
    idleHintTimer = 0
    if (status.value !== 'playing' || paused.value || isBusy.value) return
    const hint = findHintSwap(board.value, stoneHp.value)
    hintCellKey.value = hint ? `${hint.from.r},${hint.from.c}` : ''
  }, HINT_IDLE_MS)
}

function bumpUserActivity() {
  scheduleIdleHint()
}

function resumeBgmAfterClosingPause() {
  if (audioSettings.effectiveMusicVolume <= 0) return
  void playBackgroundMusic().catch(() => {})
}

/** После кнопки «Продолжить» / выхода из паузы — тот же стек жеста, что и click. */
function resumeBgmFromUserGesture() {
  if (audioSettings.effectiveMusicVolume <= 0) return
  resumeBackgroundMusicFromUserGesture()
}

function tryBgmOnBoardInteraction() {
  if (audioSettings.effectiveMusicVolume <= 0) return
  resumeBackgroundMusicFromUserGesture()
}

function openPause() {
  if (status.value !== 'playing') return
  paused.value = true
  pauseBackgroundMusic()
  /* Док Я.Игр: GameplayAPI.stop() — сигнал «логическая пауза».
     После этого площадке разрешено показать ad/уведомления. */
  yandexGames.notifyGameplayStop()
}

function closePause() {
  if (!paused.value) return
  paused.value = false
  resumeBgmFromUserGesture()
  yandexGames.notifyGameplayStart()
}

async function exitFromPauseToMenu() {
  paused.value = false
  resumeBgmFromUserGesture()
  await exitToMenu()
}

function onPauseKeydown(ev) {
  if (ev.key !== 'Escape' || !paused.value) return
  ev.preventDefault()
  closePause()
}

const levelId = computed(() => parseInt(route.params.id, 10) || 1)

const progressText = computed(() => {
  if (!objective.value) return ''
  const p = game.objectiveProgress
  const t = p.target
  const shown = t > 0 ? Math.min(p.current, t) : p.current
  return `${shown} / ${t}`
})

function spawnScoreFlyCoins(keySet) {
  if (!keySet || keySet.size === 0) return
  void nextTick(() => {
    const board = boardRef.value
    const scoreEl = scoreTargetRef.value
    if (!board?.getMatchCentroidScreen || !scoreEl) return
    const start = board.getMatchCentroidScreen(keySet)
    if (!start) return
    const tr = scoreEl.getBoundingClientRect()
    const x1 = tr.left + tr.width / 2
    const y1 = tr.top + tr.height / 2
    const n = Math.min(4, Math.max(1, Math.ceil(keySet.size / 3)))
    const jitter = 14
    const batch = []
    for (let i = 0; i < n; i += 1) {
      batch.push({
        id: ++flyCoinSeq,
        x0: start.x + (Math.random() - 0.5) * jitter,
        y0: start.y + (Math.random() - 0.5) * jitter,
        x1,
        y1,
        delay: i * 50,
      })
    }
    flyCoins.value = [...flyCoins.value, ...batch]
    window.setTimeout(() => {
      const ids = new Set(batch.map((b) => b.id))
      flyCoins.value = flyCoins.value.filter((c) => !ids.has(c.id))
    }, 800)
  })
}

watch(
  matchedKeys,
  (keys) => {
    if (status.value !== 'playing') return
    if (keys && keys.size > 0) {
      playBoardMatchBreakSfx(audioSettings.effectiveSfxVolume)
      spawnScoreFlyCoins(keys)
    }
  },
  { flush: 'post' },
)

const collectGoalIconUrl = computed(() => {
  if (objective.value?.type !== 'collect') return null
  const targetColor = objective.value.color
  // Показываем иконку только если такой цвет реально присутствует на доске.
  for (const row of board.value) {
    for (const v of row) {
      if (getColor(v) === targetColor) return getBoardChipIconUrl(targetColor)
    }
  }
  return null
})

// Для цели «очки» показываем одну понятную иконку (а не набор фишек, который путает).

onMounted(() => {
  window.addEventListener('keydown', onPauseKeydown)
  game.startLevel(levelId.value, { tutorial: tutorialActive.value })
  yandexGames.notifyGameplayStart()
  void yandexGames.showStickyBannerAdv()
  scheduleIdleHint()
  if (tutorialActive.value) {
    tutorialStep.value = 'swap'
    void nextTick(() => startHudTourIfNeeded())
  }
  void updateTutorialUi()
})

onBeforeUnmount(() => {
  if (boosterFxClearTimer) {
    clearTimeout(boosterFxClearTimer)
    boosterFxClearTimer = 0
  }
  window.removeEventListener('keydown', onPauseKeydown)
  clearIdleHintTimer()
  hintCellKey.value = ''
  paused.value = false
  resumeBgmAfterClosingPause()
  yandexGames.notifyGameplayStop()
  void yandexGames.hideStickyBannerAdv()
})

watch(
  () => route.params.id,
  (id) => {
    paused.value = false
    boosterPick.value = null
    lossModalVisible.value = false
    resumeBgmAfterClosingPause()
    const n = parseInt(id, 10) || 1
    game.startLevel(n, { tutorial: tutorialActive.value && n === 1 })
    bumpUserActivity()
    if (tutorialActive.value && n === 1) {
      tutorialStep.value = 'swap'
      void nextTick(() => startHudTourIfNeeded())
    }
    void updateTutorialUi()
  },
)

watch(status, (s) => {
  if (s !== 'playing') {
    paused.value = false
    boosterPick.value = null
    if (s === 'no_moves') {
      pauseBackgroundMusic()
      yandexGames.notifyGameplayStop()
    } else {
      resumeBgmAfterClosingPause()
    }
    clearIdleHintTimer()
    hintCellKey.value = ''
  }
})

watch(isBusy, (busy) => {
  if (busy) {
    clearIdleHintTimer()
    hintCellKey.value = ''
  } else {
    scheduleIdleHint()
  }
})

watch(
  tutorialActive,
  () => {
    void updateTutorialUi()
  },
  { flush: 'post' },
)

watch(
  [tutorialActive, goalsCardRef, movesPillRef, boostRowRef],
  () => {
    if (tutorialActive.value) {
      void nextTick(() => startHudTourIfNeeded())
    }
  },
  { flush: 'post' },
)

watch(
  board,
  () => {
    // Чтобы окно не "шаталось" от каскадов/перерисовок,
    // обновляем позицию только на шаге свайпа (когда завязано на клетки).
    if (tutorialActive.value && tutorialStep.value === 'swap') {
      void updateTutorialUi()
    }
  },
  { flush: 'post' },
)

watch(
  lastUserSwap,
  (s) => {
    if (!tutorialActive.value || !s) return
    const ok =
      (s.a.r === tutorialExpected.r &&
        s.a.c === tutorialExpected.c &&
        s.b.r === tutorialExpected.r + tutorialExpected.dr &&
        s.b.c === tutorialExpected.c + tutorialExpected.dc) ||
      (s.b.r === tutorialExpected.r &&
        s.b.c === tutorialExpected.c &&
        s.a.r === tutorialExpected.r + tutorialExpected.dr &&
        s.a.c === tutorialExpected.c + tutorialExpected.dc)
    if (ok) {
      try {
        swapTour?.destroy?.()
      } catch {
        /* ignore */
      }
      progress.markTutorialDone()
    }
  },
  { flush: 'post' },
)

watch(paused, (p) => {
  if (p) {
    clearIdleHintTimer()
    hintCellKey.value = ''
    boosterPick.value = null
  } else if (status.value === 'playing') {
    scheduleIdleHint()
  }
})

watch(status, async (s) => {
  if (s !== 'won' && s !== 'lost') return
  if (s === 'lost') {
    playGameOverSfx(audioSettings.effectiveSfxVolume)
    if (lostReason.value === 'surrender') {
      await navigateToLossResult({ skipDelay: true })
      return
    }
    lossModalVisible.value = true
    return
  }
  playSuccessSfx(audioSettings.effectiveSfxVolume)
  await new Promise((r) => setTimeout(r, 700))
  yandexGames.notifyGameplayStop()
  await yandexGames.hideStickyBannerAdv()
  await yandexGames.showFullscreenAdv({ resumeAudioAfterClose: false })
  router.replace({
    name: 'result',
    query: {
      level: String(levelId.value),
      stars: String(stars.value),
      score: String(score.value),
      coins: String(coinsEarned.value),
      result: s,
    },
  })
})

async function navigateToLossResult(opts = {}) {
  const skipDelay = !!opts.skipDelay
  if (!skipDelay) {
    await new Promise((r) => setTimeout(r, 280))
  }
  yandexGames.notifyGameplayStop()
  await yandexGames.hideStickyBannerAdv()
  await yandexGames.showFullscreenAdv({ resumeAudioAfterClose: false })
  router.replace({
    name: 'result',
    query: {
      level: String(levelId.value),
      stars: String(stars.value),
      score: String(score.value),
      coins: String(coinsEarned.value),
      result: 'lost',
    },
  })
}

async function finishLossToResult() {
  lossModalVisible.value = false
  await navigateToLossResult()
}

async function watchAdContinueAfterLoss() {
  if (
    status.value !== 'lost' ||
    lossAdBusy.value ||
    !lossModalVisible.value
  ) {
    return
  }
  lossAdBusy.value = true
  boosterPick.value = null
  tryBgmOnBoardInteraction()
  try {
    const res = await yandexGames.showRewardedVideo()
    if (res.rewarded && game.resumeAfterLossWithMoves(REWARD_MOVES_FROM_AD)) {
      lossModalVisible.value = false
      yandexGames.notifyGameplayStart()
      resumeBgmFromUserGesture()
      bumpUserActivity()
      showRewardForMoves(REWARD_MOVES_FROM_AD)
    }
  } finally {
    lossAdBusy.value = false
  }
}

async function watchRewardedForBooster(
  /** @type {'bomb' | 'clock' | 'star'} */ kind,
) {
  if (
    status.value !== 'playing' ||
    paused.value ||
    isBusy.value ||
    rewardAdBusy.value
  ) {
    return
  }
  rewardAdBusy.value = true
  boosterPick.value = null
  tryBgmOnBoardInteraction()
  try {
    const res = await yandexGames.showRewardedVideo()
    if (res.rewarded) {
      game.grantBoosterFromRewardAd(kind)
      bumpUserActivity()
      showRewardForBooster(kind)
    }
  } finally {
    rewardAdBusy.value = false
  }
}

function selectBooster(kind) {
  if (
    status.value !== 'playing' ||
    paused.value ||
    isBusy.value ||
    rewardAdBusy.value
  ) {
    return
  }
  if (kind === 'bomb' && boosterBomb.value <= 0) {
    watchRewardedForBooster('bomb')
    return
  }
  if (kind === 'clock' && boosterClock.value <= 0) {
    watchRewardedForBooster('clock')
    return
  }
  if (kind === 'star' && boosterStar.value <= 0) {
    watchRewardedForBooster('star')
    return
  }
  if (kind === 'clock') {
    const ok = game.useClockBooster()
    if (ok) flashBoosterFx('clock')
    boosterPick.value = null
    bumpUserActivity()
    return
  }
  boosterPick.value = boosterPick.value === kind ? null : kind
}

async function watchRewardedForMoves() {
  if (status.value !== 'playing' || paused.value || isBusy.value || rewardAdBusy.value) {
    return
  }
  rewardAdBusy.value = true
  boosterPick.value = null
  tryBgmOnBoardInteraction()
  try {
    const res = await yandexGames.showRewardedVideo()
    if (res.rewarded) {
      game.grantBonusMoves(REWARD_MOVES_FROM_AD)
      bumpUserActivity()
      showRewardForMoves(REWARD_MOVES_FROM_AD)
    }
  } finally {
    rewardAdBusy.value = false
  }
}

async function onNoMovesShuffleFree() {
  if (status.value !== 'no_moves' || noMovesActionBusy.value || noMovesAdBusy.value) return
  noMovesActionBusy.value = true
  tryBgmOnBoardInteraction()
  try {
    const ok = await game.resolveNoMovesShuffleFree()
    if (ok) {
      yandexGames.notifyGameplayStart()
      resumeBgmFromUserGesture()
      bumpUserActivity()
    }
  } finally {
    noMovesActionBusy.value = false
  }
}

async function onNoMovesShuffleForCoins() {
  if (status.value !== 'no_moves' || noMovesActionBusy.value || noMovesAdBusy.value) return
  noMovesActionBusy.value = true
  tryBgmOnBoardInteraction()
  try {
    const ok = await game.resolveNoMovesShuffleForCoins()
    if (ok) {
      yandexGames.notifyGameplayStart()
      resumeBgmFromUserGesture()
      bumpUserActivity()
    }
  } finally {
    noMovesActionBusy.value = false
  }
}

async function watchNoMovesRewardedAd() {
  if (status.value !== 'no_moves' || noMovesActionBusy.value || noMovesAdBusy.value) return
  noMovesAdBusy.value = true
  tryBgmOnBoardInteraction()
  try {
    const res = await yandexGames.showRewardedVideo()
    if (res.rewarded && (await game.resolveNoMovesAfterRewardedAd(REWARD_MOVES_FROM_AD))) {
      yandexGames.notifyGameplayStart()
      resumeBgmFromUserGesture()
      bumpUserActivity()
      showRewardForMoves(REWARD_MOVES_FROM_AD)
    }
  } finally {
    noMovesAdBusy.value = false
  }
}

function onNoMovesSurrender() {
  if (status.value !== 'no_moves' || noMovesActionBusy.value || noMovesAdBusy.value) return
  game.resolveNoMovesSurrender()
}

async function onTap(payload) {
  tryBgmOnBoardInteraction()
  bumpUserActivity()
  if (tutorialActive.value) return
  if (boosterPick.value === 'bomb') {
    if (boosterBomb.value > 0) {
      flashBoosterFx('bomb')
      await game.applyBombBooster(payload.r, payload.c)
      boosterPick.value = null
    }
    return
  }
  if (boosterPick.value === 'star') {
    if (boosterStar.value > 0) {
      flashBoosterFx('star')
      await game.applyStarBooster(payload.r, payload.c)
      boosterPick.value = null
    }
    return
  }
  await game.tapCell(payload.r, payload.c)
}
async function onSwipe(payload) {
  boosterPick.value = null
  tryBgmOnBoardInteraction()
  bumpUserActivity()
  if (tutorialActive.value) {
    if (tutorialStep.value !== 'swap') return
    const ok =
      payload.r === tutorialExpected.r &&
      payload.c === tutorialExpected.c &&
      payload.dr === tutorialExpected.dr &&
      payload.dc === tutorialExpected.dc
    if (!ok) return
  }
  await game.swipe(payload.r, payload.c, payload.dr, payload.dc)
}

async function exitToMenu() {
  clearIdleHintTimer()
  hintCellKey.value = ''
  game.quit()
  yandexGames.notifyGameplayStop()
  await yandexGames.hideStickyBannerAdv()
  router.push({ name: 'menu' })
}

</script>

<style scoped>
.play {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  color: var(--m3-text);
  overflow: hidden;
}

.play__pause-scrim {
  z-index: 220;
}

.play__pause-dialog {
  width: min(100%, 300px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  padding: 2.05rem 1.15rem 1.2rem;
  box-sizing: border-box;
}
.play__pause-ribbon {
  position: absolute;
  top: -1.05rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.92rem;
  z-index: 2;
}
.play__pause-sub {
  margin: 0;
  padding: 2.05rem 0 0;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}
.play__pause-actions {
  justify-content: center;
  gap: 1.05rem;
}

.play__no-moves-scrim {
  z-index: 225;
}

.play__no-moves-dialog {
  width: min(100%, 320px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  padding: 2.05rem 1.15rem 1.25rem;
  box-sizing: border-box;
}

.play__no-moves-ribbon {
  position: absolute;
  top: -1.05rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.88rem;
  z-index: 2;
}

.play__no-moves-lead {
  margin: 0;
  padding: 2rem 0 0;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.play__no-moves-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.play__no-moves-btn {
  width: 100%;
  max-width: none;
  margin: 0;
}

.play__no-moves-surrender {
  margin: 0.35rem 0 0;
  padding: 0.5rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: #6e3911;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  cursor: pointer;
}

.play__no-moves-surrender:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.play__loss-scrim {
  z-index: 230;
}

.play__loss-dialog {
  width: min(100%, 320px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  padding: 2.05rem 1.15rem 1.25rem;
  box-sizing: border-box;
}

.play__loss-ribbon {
  position: absolute;
  top: -1.05rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.88rem;
  z-index: 2;
}

.play__loss-lead {
  margin: 0;
  padding: 2rem 0 0;
  text-align: center;
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.play__loss-lead strong {
  color: #c67612;
}

.play__loss-ad-btn {
  width: 100%;
  max-width: none;
  margin: 0;
}

.play__loss-skip {
  margin: 0;
  padding: 0.5rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  color: #6e3911;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  cursor: pointer;
  opacity: 1;
}

.play__loss-skip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.play__fly-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  overflow: hidden;
}
.play__fly-coin {
  position: absolute;
  width: 2.45rem;
  height: 2.45rem;
  margin-left: -1.225rem;
  margin-top: -1.225rem;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: play-fly-coin 0.68s cubic-bezier(0.2, 0.75, 0.35, 1) forwards;
  will-change: transform, opacity;
}
.play__fly-coin__icon {
  width: 100%;
  height: 100%;
  color: #ffd84a;
  filter: drop-shadow(0 3px 5px rgba(60, 30, 10, 0.5));
}
@keyframes play-fly-coin {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--dx), var(--dy)) scale(0.35);
    opacity: 0;
  }
}

.play__top {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.35rem 0.45rem;
  padding: max(0.42rem, env(safe-area-inset-top, 0px)) 0.7rem 0.28rem;
}

.play__top-left {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}
.play__top-stats {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.22rem;
  min-width: 0;
  justify-self: end;
}
.play__top-pill {
  font-size: 0.82rem;
}
.play__top-pill :deep(.m3-top-pill__icon) {
  width: 1.35rem;
  height: 1.35rem;
}
.play__top-pill :deep(.m3-top-pill__icon svg) {
  width: 0.85rem;
  height: 0.85rem;
}
.play__top-pill--low {
  border-color: #9a2a22 !important;
  color: #7a1810 !important;
}
.play__top-pill--low :deep(.m3-top-pill__icon) {
  border-color: #9a2a22 !important;
}
.play__back {
  width: 2.4rem;
  height: 2.4rem;
  border: 3px solid var(--m3-border-dark);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 100%);
  color: #6e3911;
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
}
.play__back:active {
  transform: translateY(2px);
}
.play__back:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}
.play__back :deep(svg) {
  width: 1.12rem;
  height: 1.12rem;
  flex-shrink: 0;
}
.play__lvl {
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
.play__lvl strong {
  color: #ffd84a;
  font-weight: 900;
  margin-left: 0.25em;
}

.play__hud {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  padding: 0.32rem 0.65rem 0;
}

.play__goals-booster-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: var(--play-goals-inner-min-h);
  padding: 0 0.15rem;
}

.play__goals-booster-hint-text {
  margin: 0;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  animation: play-booster-hint-in 0.26s ease-out;
}

.play__hud-card {
  border: 3px solid var(--m3-border-dark);
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    var(--m3-wood-1) 0%,
    var(--m3-wood-2) 100%
  );
  padding: 0.5rem 0.7rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 0 rgba(110, 57, 17, 0.3),
    0 3px 0 rgba(110, 57, 17, 0.55);
}
.play__hud-card--goals {
  /* Общая минимальная «рабочая» высота блока целей и подсказки бустера */
  --play-goals-inner-min-h: max(1.45rem, calc(1.15rem * 1.32));
  padding: 0.42rem 0.8rem 0.45rem;
  gap: 0;
  border-color: #5c5852;
}
.play__goals-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  min-width: 0;
  min-height: var(--play-goals-inner-min-h);
}
.play__hud-label--goals-title {
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  flex-shrink: 0;
}
.play__goals-stack {
  display: flex;
  flex-direction: column;
  gap: 0.26rem;
  min-width: 0;
}
.play__goals-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.85rem;
  min-width: 0;
  /* flex: 1 1 auto; */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.play__goals-row--spread {
  justify-content: space-between;
  gap: 0.5rem;
}
.play__goals-row::-webkit-scrollbar {
  display: none;
}
.play__goal-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.play__goal-icon {
  width: 1.45rem;
  height: 1.45rem;
  flex-shrink: 0;
}
.play__goal-icon--stone {
  color: #6b6560;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.35));
}
.play__goal-icon--score {
  color: #ffd84a;
  filter: drop-shadow(0 2px 3px rgba(60, 30, 10, 0.45));
}
.play__goal-icon--stone-img {
  object-fit: contain;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.35));
}
.play__goal-count {
  font-size: 1.15rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--m3-text-on-wood);
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}
.play__goal-chips {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.1rem;
  max-width: min(11.5rem, 100%);
  flex-shrink: 1;
  min-width: 0;
}
.play__chip--goal-inline {
  display: block;
  width: 1.45rem;
  height: 1.45rem;
  object-fit: contain;
  flex-shrink: 0;
  border: none;
  background: none;
  box-shadow: none;
}
.play__chip--goal-inline.play__chip--goal-stack {
  width: 1.12rem;
  height: 1.12rem;
}
.play__hud-label {
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--m3-text-soft);
}
.play__chip {
  display: block;
  width: 1.55rem;
  height: 1.55rem;
  object-fit: contain;
  flex-shrink: 0;
  border: none;
  background: none;
  box-shadow: none;
}

.play__board-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.4rem;
  overflow: hidden;
}

.play__booster-flash {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.play__booster-flash-icon {
  width: min(46vw, 168px);
  height: min(46vw, 168px);
  object-fit: contain;
  filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.38));
  animation: play-booster-flash-pop 0.52s cubic-bezier(0.34, 1.45, 0.64, 1) forwards;
}

@keyframes play-booster-flash-pop {
  0% {
    opacity: 0;
    transform: scale(0.38);
  }
  42% {
    opacity: 1;
    transform: scale(1.08);
  }
  72% {
    opacity: 1;
    transform: scale(0.98);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .play__booster-flash-icon {
    animation: none;
    opacity: 0.85;
    transform: scale(1);
  }
}

@keyframes play-booster-hint-in {
  from {
    opacity: 0;
    transform: translateY(5px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.play__boost-row {
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  justify-content: stretch;
  gap: 0.28rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0 0.65rem;
  margin: 0 0 max(0.28rem, env(safe-area-inset-bottom, 0px));
}

.play__boost-btn {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 2.75rem;
  padding: 0;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 0.3rem;
  border-radius: 10px;
  border: 2.5px solid var(--m3-border-dark);
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 92%);
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 2px 0 rgba(110, 57, 17, 0.42);
  color: #fff;
  -webkit-tap-highlight-color: transparent;
}

.play__boost-btn--ad {
  background: linear-gradient(180deg, #d4b8ec 0%, #8855b8 92%);
}

.play__boost-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.play__boost-btn:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.play__boost-btn--on {
  background: linear-gradient(180deg, #d7ff8a 0%, #69c92a 92%);
  border-color: #2f6c12;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 0 0 2px rgba(200, 232, 92, 0.55),
    0 2px 0 rgba(110, 57, 17, 0.42);
}

.play__boost-ico {
  width: 1.34rem;
  height: 1.34rem;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
  pointer-events: none;
  position: relative;
  z-index: 0;
}

.play__boost-count {
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1;
  color: #fff;
  text-shadow:
    -1px 0 0 #5a1f10,
    1px 0 0 #5a1f10,
    0 -1px 0 #5a1f10,
    0 1px 0 #5a1f10,
    0 2px 0 rgba(90, 31, 16, 0.45);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.play__boost-ico--svg {
  width: 1.32rem;
  height: 1.32rem;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.play__boost-ico--svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.play__boost-ad-ico {
  width: 1.12rem;
  height: 1.12rem;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.92);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
  pointer-events: none;
}

.play__boost-ad-ico :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.play__foot {
  padding: 0 0.85rem max(0.7rem, env(safe-area-inset-bottom, 0px));
}
.play__hint {
  margin: 0;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 900;
  color: #fff;
  text-shadow:
    -1px 0 0 #6e3911,
    1px 0 0 #6e3911,
    0 -1px 0 #6e3911,
    0 1px 0 #6e3911;
}
.play__hint--ok {
  color: #b6e15a;
}
.play__hint--bad {
  color: #ff8a82;
}

/* ===================== Tutorial overlay ===================== */
.m3-tutorial {
  position: absolute;
  inset: 0;
  z-index: 260;
  pointer-events: auto;
}
.m3-tutorial--swap {
  pointer-events: none;
}

.m3-tutorial__dim {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.m3-tutorial__ring {
  z-index: 1;
  position: absolute;
  border-radius: 14px;
  border: 3px solid rgba(255, 255, 255, 0.95);
  /* Только светлое кольцо: тень без чёрного слоя — иначе она рисуется поверх фишек и «гасит» иконки. */
  box-shadow:
    0 0 0 4px rgba(255, 226, 122, 0.55),
    0 0 16px rgba(255, 235, 160, 0.55);
  background: transparent;
  pointer-events: none;
}

.m3-tutorial__step-panel {
  position: absolute;
  padding: 1.1rem 0.9rem 0.75rem;
  border-radius: 16px;
  border: 3px solid var(--m3-border-dark);
  background: linear-gradient(180deg, var(--m3-wood-1) 0%, var(--m3-wood-2) 100%);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 0 rgba(110, 57, 17, 0.28),
    0 8px 18px rgba(0, 0, 0, 0.25);
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
  pointer-events: none;
  z-index: 5;
}
.m3-tutorial__step-ribbon {
  position: absolute;
  top: -0.85rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 2px solid rgba(70, 40, 18, 0.55);
  background: linear-gradient(180deg, #ffe27a 0%, #ffae22 80%, #d97a14 100%);
  color: #6e3911;
  font-weight: 900;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 4px 10px rgba(0, 0, 0, 0.18);
}
.m3-tutorial__step-title {
  font-weight: 900;
  font-size: 0.9rem;
  line-height: 1.1;
}
.m3-tutorial__step-sub {
  margin-top: 0.25rem;
  font-weight: 800;
  font-size: 0.78rem;
  opacity: 0.95;
}

/* ===================== Driver.js (HUD-туториал) ===================== */
:global(.driver-popover) {
  border-radius: 16px !important;
  border: 3px solid var(--m3-border-dark) !important;
  background: linear-gradient(
    180deg,
    var(--m3-wood-1, #f1d6a7) 0%,
    var(--m3-wood-2, #d6ab6d) 100%
  ) !important;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 0 rgba(110, 57, 17, 0.28),
    0 10px 22px rgba(0, 0, 0, 0.25) !important;
  color: var(--m3-text-on-wood, #2b1a0e) !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45) !important;
  font-family: inherit !important;
  opacity: 1 !important;
  backdrop-filter: none !important;
}
:global(.driver-popover-title) {
  font-weight: 900 !important;
  font-size: 0.95rem !important;
  margin: 0 !important;
}
:global(.driver-popover-description) {
  font-weight: 700 !important;
  font-size: 0.82rem !important;
  line-height: 1.25 !important;
  margin-top: 0.25rem !important;
  opacity: 0.95 !important;
}
:global(.driver-popover-footer) {
  margin-top: 0.6rem !important;
  gap: 0.45rem !important;
}
:global(.driver-popover-prev-btn),
:global(.driver-popover-next-btn),
:global(.driver-popover-close-btn) {
  font: inherit !important;
  border-radius: 12px !important;
  border: 2.5px solid var(--m3-border-dark) !important;
  padding: 0.4rem 0.7rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(110, 57, 17, 0.28),
    0 3px 0 rgba(110, 57, 17, 0.55) !important;
}
:global(.driver-popover-next-btn) {
  background: linear-gradient(180deg, var(--m3-go-1) 0%, var(--m3-go-2) 92%) !important;
  color: #6e3911 !important;
}
:global(.driver-popover-prev-btn) {
  background: linear-gradient(180deg, #d6d2c6 0%, #a39d8d 60%, #6f6a5e 100%) !important;
  color: #4a4538 !important;
}
:global(.driver-popover-prev-btn:disabled) {
  opacity: 0.55 !important;
  cursor: not-allowed !important;
}
:global(.driver-popover-arrow) {
  color: var(--m3-wood-2) !important;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18)) !important;
}
.m3-tutorial__ring--from {
  animation: m3-tutorial-pulse 0.9s ease-in-out infinite;
}
@keyframes m3-tutorial-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}
.m3-tutorial__hint {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  pointer-events: none;
  z-index: 4;
}
.m3-tutorial__panel {
  position: relative;
  max-width: min(320px, 86vw);
  padding: 1.2rem 0.9rem 0.85rem;
  border-radius: 16px;
  border: 3px solid var(--m3-border-dark);
  background: linear-gradient(180deg, var(--m3-wood-1) 0%, var(--m3-wood-2) 100%);
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.55),
    inset 0 -3px 0 rgba(110, 57, 17, 0.28),
    0 8px 18px rgba(0, 0, 0, 0.25);
  color: var(--m3-text-on-wood);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}
.m3-tutorial__ribbon {
  position: absolute;
  top: -0.85rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 2px solid rgba(70, 40, 18, 0.55);
  background: linear-gradient(180deg, #ffe27a 0%, #ffae22 80%, #d97a14 100%);
  color: #6e3911;
  font-weight: 900;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 4px 10px rgba(0, 0, 0, 0.18);
}
.m3-tutorial__title {
  font-weight: 900;
  font-size: 0.88rem;
  line-height: 1.1;
}
.m3-tutorial__text {
  margin-top: 0.2rem;
  font-weight: 700;
  font-size: 0.78rem;
  line-height: 1.25;
  opacity: 0.95;
}

.m3-tutorial__swipe {
  position: absolute;
  height: 0;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.22));
}
.m3-tutorial__swipe-line {
  position: absolute;
  left: 0;
  top: 0;
  height: 6px;
  width: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 226, 122, 0.0) 0%, rgba(255, 226, 122, 0.95) 40%, rgba(255, 226, 122, 0.95) 100%);
  transform: translateY(-50%);
}
.m3-tutorial__swipe-head {
  position: absolute;
  right: -2px;
  top: 0;
  width: 0;
  height: 0;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  border-left: 14px solid rgba(255, 226, 122, 0.98);
  transform: translateY(-50%);
}
</style>
