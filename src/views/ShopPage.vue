<template>
  <PhoneFrame :parallax="false">
    <div class="shop" data-allow-browser-scroll>
      <header class="shop__top">
        <button type="button" class="shop__back" aria-label="Назад" @click="goBack">
          <Icon icon="mdi:chevron-left" />
        </button>
        <h1 class="shop__title">Магазин</h1>
        <span class="m3-top-pill shop__coins" :title="`Монеты: ${coins}`">
          <span class="m3-top-pill__icon m3-top-pill__icon--coin" aria-hidden="true">
            <Icon icon="mdi:cash" />
          </span>
          {{ coins }}
        </span>
      </header>

      <p class="shop__intro m3-modal-panel">
        Потрать <strong>монеты</strong> на дополнительные заряды бустеров. При старте уровня с запаса
        автоматически переносится до <strong>8</strong> зарядов каждого типа (к базовым трём).
      </p>

      <div class="shop__stock m3-wood-panel">
        <span class="shop__stock-label">В запасе к следующему уровню</span>
        <div class="shop__stock-row">
          <span class="shop__stock-item" title="Бомба">
            <img v-if="iconBomb" :src="iconBomb" alt="" class="shop__stock-ico" />
            × {{ storedBoosters.bomb }}
          </span>
          <span class="shop__stock-item" title="Время">
            <img v-if="iconClock" :src="iconClock" alt="" class="shop__stock-ico" />
            × {{ storedBoosters.clock }}
          </span>
          <span class="shop__stock-item" title="Звезда">
            <img v-if="iconStar" :src="iconStar" alt="" class="shop__stock-ico" />
            × {{ storedBoosters.star }}
          </span>
        </div>
      </div>

      <ul class="shop__grid" role="list">
        <li
          v-for="cell in gridCells"
          :key="cell.index"
          class="shop__cell m3-modal-panel"
          role="listitem"
        >
          <button
            type="button"
            class="shop__cell-tap"
            :aria-label="`Подробнее: ${cell.offer.title}`"
            @click="openShopDetail(cell.offer)"
          >
            <div class="shop__sticker-wrap">
              <img :src="cell.stickerUrl" alt="" class="shop__sticker" draggable="false" />
            </div>
            <span class="shop__cell-title">{{ cell.offer.title }}</span>
          </button>
          <div class="shop__cell-buy">
            <span class="shop__price">
              <Icon icon="mdi:cash" class="shop__price-ic" aria-hidden="true" />
              {{ cell.offer.price }}
            </span>
            <button type="button" class="shop__buy-btn" @click="buy(cell.offer)">Купить</button>
          </div>
        </li>
      </ul>

      <div
        v-if="detailOffer"
        class="m3-modal-overlay shop__detail-scrim"
        role="presentation"
        @click.self="closeShopDetail"
      >
        <div
          class="m3-modal-panel shop__detail-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="shopDetailTitleId"
          @click.stop
        >
          <h2 :id="shopDetailTitleId" class="shop__detail-title">{{ detailOffer.title }}</h2>
          <p class="shop__detail-hint">{{ detailOffer.hint }}</p>
          <MenuActionButton variant="hero" class="shop__detail-ok" @click="closeShopDetail">
            Понятно
          </MenuActionButton>
        </div>
      </div>

      <p v-if="toast" class="shop__toast" role="status">{{ toast }}</p>

      <footer class="shop__bottom-bar">
        <MenuActionButton variant="hero" class="shop__bottom-back" @click="goBack">
          В меню
        </MenuActionButton>
      </footer>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'ShopPage' })

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PhoneFrame from '@/components/PhoneFrame.vue'
import MenuActionButton from '@/components/MenuActionButton.vue'
import { Icon } from '@iconify/vue'
import { useMatch3ProgressStore } from '@/stores/match3Progress'
import { SHOP_OFFERS } from '@/game/shopCatalog.js'
import { getBoosterIconUrl } from '@/game/chipIcons.js'
import { getStickerUrls2x2 } from '@/game/shopStickers.js'

const router = useRouter()
const progress = useMatch3ProgressStore()
const { coins, storedBoosters } = storeToRefs(progress)

const iconBomb = computed(() => getBoosterIconUrl('bomb'))
const iconClock = computed(() => getBoosterIconUrl('clock'))
const iconStar = computed(() => getBoosterIconUrl('star'))

const stickerUrls2x2 = getStickerUrls2x2()
const gridCells = computed(() =>
  stickerUrls2x2.map((stickerUrl, index) => ({
    index,
    stickerUrl,
    offer: SHOP_OFFERS[index],
  })),
)

const toast = ref('')
let toastTimer = 0

/** @type {import('vue').Ref<(typeof SHOP_OFFERS)[number] | null>} */
const detailOffer = ref(null)
const shopDetailTitleId = 'shop-offer-detail-title'

function openShopDetail(offer) {
  detailOffer.value = offer
}

function closeShopDetail() {
  detailOffer.value = null
}

function showToast(msg) {
  toast.value = msg
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
    toastTimer = 0
  }, 2200)
}

function buy(offer) {
  if (!progress.trySpendCoins(offer.price)) {
    showToast('Недостаточно монет')
    return
  }
  if (offer.type === 'single') {
    progress.addStoredBooster(offer.kind, offer.qty)
  } else {
    progress.addStoredBooster('bomb', offer.bundle.bomb)
    progress.addStoredBooster('clock', offer.bundle.clock)
    progress.addStoredBooster('star', offer.bundle.star)
  }
  showToast('Покупка добавлена в запас')
}

function goBack() {
  router.push({ name: 'menu' })
}

function onEscape(e) {
  if (e.key !== 'Escape') return
  if (detailOffer.value) {
    e.preventDefault()
    closeShopDetail()
    return
  }
  goBack()
}
onMounted(() => window.addEventListener('keydown', onEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', onEscape))
</script>

<style scoped>
.shop {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
  padding: 0 0.85rem max(1rem, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  color: var(--m3-text);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.shop__top {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-top: max(0.25rem, env(safe-area-inset-top, 0px));
}

.shop__back {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.55);
  color: var(--m3-text);
  cursor: pointer;
  font-size: 1.5rem;
}

.shop__title {
  flex: 1;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-align: center;
}

.shop__coins {
  flex: 0 0 auto;
}

.shop__intro {
  margin: 0;
  padding: 0.65rem 0.75rem;
  font-size: 0.88rem;
  line-height: 1.35;
}

.shop__stock {
  position: relative;
  padding: 0.75rem 0.85rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.shop__stock-label {
  font-weight: 800;
  font-size: 0.82rem;
  opacity: 0.92;
}

.shop__stock-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.shop__stock-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.shop__stock-ico {
  width: 1.85rem;
  height: 1.85rem;
  object-fit: contain;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.12));
}

.shop__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.shop__cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  padding: 0.55rem 0.5rem 0.58rem;
  min-height: 0;
}

.shop__cell-tap {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 10px;
  -webkit-tap-highlight-color: transparent;
}

.shop__cell-tap:focus-visible {
  outline: 2px solid rgba(110, 57, 17, 0.65);
  outline-offset: 2px;
}

.shop__cell-tap:active .shop__sticker-wrap {
  transform: scale(0.98);
}

.shop__sticker-wrap {
  transition: transform 0.12s ease;
}
  aspect-ratio: 1;
  width: 100%;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(230, 240, 255, 0.45) 100%);
  border: 2px solid rgba(110, 57, 17, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.shop__sticker {
  width: 88%;
  height: 88%;
  object-fit: contain;
  filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.12));
}

.shop__cell-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 900;
  line-height: 1.15;
  text-align: center;
  color: var(--m3-text-on-wood, #4a2810);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.shop__cell-hint {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 650;
  line-height: 1.25;
  text-align: center;
  color: #5c4030;
  opacity: 0.95;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.shop__cell-buy {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.32rem;
  margin-top: auto;
  padding-top: 0.2rem;
}

.shop__price {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.18rem;
  font-weight: 900;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  color: #6e3911;
}

.shop__price-ic {
  font-size: 0.92rem;
  opacity: 0.85;
}

.shop__buy-btn {
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.5rem;
  font-weight: 900;
  font-size: 0.74rem;
  letter-spacing: 0.03em;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(180deg, #5cbf6a 0%, #3a9d4a 100%);
  box-shadow: 0 2px 0 rgba(30, 90, 40, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.shop__buy-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 rgba(30, 90, 40, 0.45);
}

.shop__toast {
  margin: 0;
  text-align: center;
  font-weight: 800;
  font-size: 0.88rem;
  color: var(--m3-text-on-wood, var(--m3-text));
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

.shop__bottom-bar {
  margin-top: auto;
  padding-top: 0.35rem;
}

.shop__bottom-back {
  width: 100%;
}
</style>
