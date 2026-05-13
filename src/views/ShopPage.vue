<template>
  <PhoneFrame :parallax="false">
    <div
      class="shop"
      :class="{ 'shop--detail-open': !!detailOffer || purchaseSuccessVisible }"
      data-allow-browser-scroll
    >
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

      <div class="shop__stock m3-wood-panel">
        <span class="shop__stock-label">В запасе к следующему уровню</span>
        <div class="shop__stock-row">
          <span class="shop__stock-item" :title="BOOSTER_DISPLAY_NAME.bomb">
            <img v-if="iconBomb" :src="iconBomb" alt="" class="shop__stock-ico" />
            × {{ storedBoosters.bomb }}
          </span>
          <span class="shop__stock-item" :title="BOOSTER_DISPLAY_NAME.clock">
            <img v-if="iconClock" :src="iconClock" alt="" class="shop__stock-ico" />
            × {{ storedBoosters.clock }}
          </span>
          <span class="shop__stock-item" :title="BOOSTER_DISPLAY_NAME.star">
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
            :aria-label="`Подробнее: ${cell.offer.title}, цена ${cell.offer.price}`"
            @click="openShopDetail(cell.offer)"
          >
            <div class="shop__sticker-wrap">
              <img :src="cell.stickerUrl" alt="" class="shop__sticker" draggable="false" />
              <span
                class="m3-top-pill shop__price-chip"
                :title="`Цена: ${cell.offer.price}`"
                aria-hidden="true"
              >
                <span class="m3-top-pill__icon m3-top-pill__icon--coin" aria-hidden="true">
                  <Icon icon="mdi:cash" />
                </span>
                {{ cell.offer.price }}
              </span>
            </div>
            <span class="shop__cell-title">{{ cell.offer.title }}</span>
          </button>
          <div class="shop__cell-buy">
            <button type="button" class="shop__buy-btn" @click="buy(cell)">Купить</button>
          </div>
        </li>
      </ul>

      <p v-if="toast" class="shop__toast" role="status">{{ toast }}</p>

      <footer class="shop__bottom-bar">
        <MenuActionButton variant="hero" class="shop__bottom-back" @click="goBack">
          В меню
        </MenuActionButton>
      </footer>

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

      <div
        v-if="purchaseSuccessVisible"
        class="m3-modal-overlay shop__detail-scrim shop__purchase-scrim"
        role="presentation"
        @click.self="closePurchaseSuccess"
      >
        <div
          class="m3-modal-panel shop__detail-dialog"
          role="dialog"
          aria-modal="true"
          aria-describedby="shop-purchase-success-lead"
          :aria-labelledby="shopPurchaseSuccessTitleId"
          @click.stop
        >
          <p id="shop-purchase-success-lead" class="shop__success-lead">
            Вы успешно приобрели
          </p>
          <div class="shop__success-sticker-wrap" aria-hidden="true">
            <img
              v-if="purchaseSuccessStickerUrl"
              :src="purchaseSuccessStickerUrl"
              alt=""
              class="shop__success-sticker"
              draggable="false"
            />
          </div>
          <h2 :id="shopPurchaseSuccessTitleId" class="shop__success-name">
            {{ purchaseSuccessTitle }}
          </h2>
          <MenuActionButton variant="hero" class="shop__detail-ok" @click="closePurchaseSuccess">
            Понятно
          </MenuActionButton>
        </div>
      </div>
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
import { BOOSTER_DISPLAY_NAME } from '@/game/boosterDisplayNames.js'
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
const purchaseSuccessVisible = ref(false)
const purchaseSuccessTitle = ref('')
const purchaseSuccessStickerUrl = ref('')
const shopPurchaseSuccessTitleId = 'shop-purchase-success-title'

function openShopDetail(offer) {
  detailOffer.value = offer
}

function closeShopDetail() {
  detailOffer.value = null
}

function closePurchaseSuccess() {
  purchaseSuccessVisible.value = false
  purchaseSuccessTitle.value = ''
  purchaseSuccessStickerUrl.value = ''
}

function showToast(msg) {
  toast.value = msg
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
    toastTimer = 0
  }, 2200)
}

/**
 * @param {{ offer: (typeof SHOP_OFFERS)[number], stickerUrl: string }} cell
 */
function buy(cell) {
  const { offer, stickerUrl } = cell
  if (!progress.trySpendCoins(offer.price)) {
    showToast('Недостаточно монет')
    return
  }
  if (offer.type === 'single') {
    progress.addStoredBooster(offer.kind, offer.qty)
  } else {
    progress.addStoredBoostersDelta(offer.bundle)
  }
  detailOffer.value = null
  purchaseSuccessTitle.value = offer.title
  purchaseSuccessStickerUrl.value = stickerUrl
  purchaseSuccessVisible.value = true
}

function goBack() {
  if (purchaseSuccessVisible.value) {
    closePurchaseSuccess()
    return
  }
  if (detailOffer.value) {
    closeShopDetail()
    return
  }
  router.push({ name: 'menu' })
}

function onEscape(e) {
  if (e.key !== 'Escape') return
  if (purchaseSuccessVisible.value) {
    e.preventDefault()
    closePurchaseSuccess()
    return
  }
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

.shop.shop--detail-open {
  overflow: hidden;
  touch-action: none;
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
  position: relative;
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
  transition: transform 0.12s ease;
}

/* Чип цены: как HUD-плашка, компактно — угол картинки справа */
.shop__price-chip.m3-top-pill {
  position: absolute;
  top: 0.28rem;
  right: 0.28rem;
  z-index: 2;
  pointer-events: none;
  min-height: 1.45rem;
  padding: 0.08rem 0.42rem 0.08rem 0.1rem;
  gap: 0.18rem;
  font-size: 0.68rem;
  border-width: 2px;
  box-shadow:
    inset 0 1.5px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1.5px 0 rgba(110, 57, 17, 0.28),
    0 2px 4px rgba(60, 30, 10, 0.22);
}

.shop__price-chip.m3-top-pill :deep(.m3-top-pill__icon) {
  width: 1.12rem;
  height: 1.12rem;
  border-width: 2px;
}

.shop__price-chip.m3-top-pill :deep(.m3-top-pill__icon svg) {
  width: 0.7rem;
  height: 0.7rem;
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

.shop__detail-scrim {
  z-index: 500;
}

.shop__purchase-scrim {
  z-index: 510;
}

.shop__success-lead {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 800;
  text-align: center;
  line-height: 1.35;
  color: #5c4030;
}

.shop__success-sticker-wrap {
  align-self: center;
  width: min(52%, 9.5rem);
  aspect-ratio: 1;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(230, 240, 255, 0.45) 100%
  );
  border: 2px solid rgba(110, 57, 17, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.shop__success-sticker {
  width: 88%;
  height: 88%;
  object-fit: contain;
  filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.12));
}

.shop__success-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 900;
  text-align: center;
  line-height: 1.2;
  color: var(--m3-text-on-wood, #4a2810);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.shop__detail-dialog {
  width: min(100%, 300px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
  padding: 1.35rem 1rem 1.1rem;
  box-sizing: border-box;
}

.shop__detail-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 900;
  text-align: center;
  color: var(--m3-text-on-wood, #4a2810);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.shop__detail-hint {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 650;
  line-height: 1.4;
  text-align: center;
  color: #5c4030;
}

.shop__detail-ok {
  width: 100%;
  max-width: none;
  margin: 0;
}

.shop__cell-buy {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-top: auto;
  padding-top: 0.15rem;
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
