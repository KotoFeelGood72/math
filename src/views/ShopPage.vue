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

      <ul class="shop__list" role="list">
        <li v-for="offer in SHOP_OFFERS" :key="offer.id" class="shop__card m3-modal-panel">
          <div class="shop__card-main">
            <div class="shop__card-icons" aria-hidden="true">
              <template v-if="offer.type === 'single'">
                <img :src="boosterIcon(offer.kind)" alt="" class="shop__offer-ico" />
              </template>
              <template v-else>
                <img :src="iconBomb" alt="" class="shop__offer-ico" />
                <img :src="iconClock" alt="" class="shop__offer-ico" />
                <img :src="iconStar" alt="" class="shop__offer-ico" />
              </template>
            </div>
            <div class="shop__card-text">
              <h2 class="shop__card-title">{{ offer.title }}</h2>
              <p class="shop__card-hint">{{ offer.hint }}</p>
            </div>
          </div>
          <div class="shop__card-buy">
            <span class="shop__price">
              <Icon icon="mdi:cash" class="shop__price-ic" aria-hidden="true" />
              {{ offer.price }}
            </span>
            <button type="button" class="shop__buy-btn" @click="buy(offer)">Купить</button>
          </div>
        </li>
      </ul>

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

const router = useRouter()
const progress = useMatch3ProgressStore()
const { coins, storedBoosters } = storeToRefs(progress)

const iconBomb = computed(() => getBoosterIconUrl('bomb'))
const iconClock = computed(() => getBoosterIconUrl('clock'))
const iconStar = computed(() => getBoosterIconUrl('star'))

const toast = ref('')
let toastTimer = 0

function showToast(msg) {
  toast.value = msg
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = ''
    toastTimer = 0
  }, 2200)
}

function boosterIcon(kind) {
  return getBoosterIconUrl(kind) ?? ''
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
  if (e.key === 'Escape') goBack()
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

.shop__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.shop__card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.75rem 0.8rem;
}

.shop__card-main {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
}

.shop__card-icons {
  flex: 0 0 auto;
  display: flex;
  gap: 0.2rem;
  align-items: center;
}

.shop__offer-ico {
  width: 2.35rem;
  height: 2.35rem;
  object-fit: contain;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.15));
}

.shop__card-text {
  flex: 1;
  min-width: 0;
}

.shop__card-title {
  margin: 0 0 0.2rem;
  font-size: 1rem;
  font-weight: 900;
}

.shop__card-hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.35;
  opacity: 0.92;
}

.shop__card-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.shop__price {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #6e3911;
}

.shop__price-ic {
  font-size: 1.1rem;
  opacity: 0.85;
}

.shop__buy-btn {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  font-weight: 900;
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(180deg, #5cbf6a 0%, #3a9d4a 100%);
  box-shadow: 0 3px 0 rgba(30, 90, 40, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.shop__buy-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 0 rgba(30, 90, 40, 0.45);
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
