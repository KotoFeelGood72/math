<template>
  <PhoneFrame :parallax="false">
    <div class="help" data-allow-browser-scroll>
      <header class="help__top">
        <button
          type="button"
          class="help__back"
          aria-label="Назад"
          @click="goBack"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <h1 class="help__title">Как играть</h1>
        <div class="help__top-spacer" />
      </header>

      <div class="help__body">
        <section class="help__panel m3-modal-panel" aria-labelledby="help-basics-h">
            <h2 id="help-basics-h" class="help__panel-title">Основы</h2>
            <p class="help__p">
              Выбирай фишку, затем соседнюю по горизонтали или вертикали — они
              поменяются местами. Если получится линия из <strong>трёх и более</strong>
              одинаковых фишек, они исчезнут, сверху упадут новые — возможны
              цепные комбо и каскады.
            </p>
            <p class="help__p">
              Свайп между соседними клетками делает то же самое. Ход, который не
              даёт совпадений, отменится (фишки вернутся).
            </p>
          </section>

        <section class="help__panel m3-modal-panel" aria-labelledby="help-goal-h">
            <h2 id="help-goal-h" class="help__panel-title">Цель и ходы</h2>
            <p class="help__p">
              У каждого уровня ограниченное число <strong>ходов</strong>. За каждый
              успешный ход счётчик уменьшается.
            </p>
            <p class="help__p">
              Задача указана на экране: набрать нужное число <strong>очков</strong>
              или <strong>собрать</strong> фишки заданного цвета. На части уровней
              нужно разбить <strong>камни</strong> под фишками, убирая фишки над
              ними.
            </p>
            <p class="help__p">
              Выполни цель, пока есть ходы — уровень пройден. Если ходы закончились
              раньше, уровень проигран (можно посмотреть рекламу за дополнительные
              ходы, если доступно).
            </p>
          </section>

        <section class="help__panel m3-modal-panel" aria-labelledby="help-special-h">
            <h2 id="help-special-h" class="help__panel-title">Бустеры на поле</h2>
            <p class="help__p">
              Длинные совпадения создают особые фишки: ракеты по строке или столбцу,
              бомбу в области и радужную фишку. Подключай их к комбинациям или
              меняй с соседней обычной фишкой — эффект зависит от типа.
            </p>
            <p class="help__p">
              <strong>Радужная</strong> фишка в паре с цветной убирает все фишки
              этого цвета с поля.
            </p>
          </section>

        <section class="help__panel m3-modal-panel" aria-labelledby="help-toolbar-h">
            <h2 id="help-toolbar-h" class="help__panel-title">Панель бустеров</h2>
            <ul class="help__list">
              <li>
                <strong>Бомба</strong> — нажми, затем выбери клетку: взрыв 3×3,
                тратит ход.
              </li>
              <li>
                <strong>Время</strong> — отменяет последний удачный ход с
                совпадениями (если он был). Если откатывать нечего, даёт несколько
                дополнительных ходов.
              </li>
              <li>
                <strong>Звезда</strong> — убирает все фишки одного цвета с поля,
                тратит ход.
              </li>
              <li>
                Кнопка с иконкой <strong>видео</strong> — посмотри рекламу за
                несколько дополнительных ходов (если платформа показывает рекламу).
              </li>
            </ul>
          </section>

        <section class="help__panel m3-modal-panel" aria-labelledby="help-progress-h">
            <h2 id="help-progress-h" class="help__panel-title">Прогресс</h2>
            <p class="help__p">
              За прохождение уровней получаешь <strong>звёзды</strong> и
              <strong>монеты</strong>. В <strong>магазине</strong> монеты можно обменять на
              дополнительные заряды бустеров — они добавятся к запасу и подтянутся при старте
              следующего уровня (до 8 зарядов каждого типа за раз, сверх базовых трёх).
            </p>
            <p class="help__p">
              Новые уровни открываются по очереди. Удачи!
            </p>
          </section>
      </div>

      <footer class="help__bottom-bar">
        <MenuActionButton variant="hero" class="help__bottom-back" @click="goBack">
          В меню
        </MenuActionButton>
      </footer>
    </div>
  </PhoneFrame>
</template>

<script setup>
defineOptions({ name: 'HowToPlayPage' })

import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PhoneFrame from '@/components/PhoneFrame.vue'
import MenuActionButton from '@/components/MenuActionButton.vue'
import { Icon } from '@iconify/vue'
const router = useRouter()

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
.help {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  color: var(--m3-text);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.help__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  padding: max(0.6rem, env(safe-area-inset-top, 0px)) 0.7rem 0.45rem;
}

.help__back {
  flex: 0 0 2.4rem;
  width: 2.4rem;
  height: 2.4rem;
  flex-shrink: 0;
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

.help__back:active {
  transform: translateY(2px);
}

.help__back :deep(svg) {
  width: 1.12rem;
  height: 1.12rem;
}

.help__title {
  flex: 1;
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

.help__top-spacer {
  flex: 0 0 2.4rem;
  width: 2.4rem;
  flex-shrink: 0;
}

.help__body {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
  padding: 0.75rem 0.7rem 0.6rem;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.help__panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 1rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.help__panel-title {
  margin: 0 0 0.15rem;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #6e3911;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
}

.help__p {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.45;
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.help__p strong {
  color: #6e3911;
  font-weight: 800;
}

.help__list {
  margin: 0;
  padding: 0 0 0 1.1rem;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.5;
  color: #4a2810;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
}

.help__list li {
  margin-bottom: 0.45rem;
}

.help__list li:last-child {
  margin-bottom: 0;
}

.help__list strong {
  color: #6e3911;
  font-weight: 800;
}

.help__bottom-bar {
  padding: 0.55rem 0.7rem max(0.65rem, env(safe-area-inset-bottom, 0px));
  flex: 0 0 auto;
  background: linear-gradient(180deg, #b9e3fa 0%, #6ec4ea 100%);
  border-top: 2px solid rgba(110, 57, 17, 0.2);
}

.help__bottom-back {
  width: 100%;
  max-width: none;
}
</style>
