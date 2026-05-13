import { createRouter, createWebHashHistory } from 'vue-router'
import MainMenuPage from '@/views/MainMenuPage.vue'
import LevelSelectPage from '@/views/LevelSelectPage.vue'
import Match3GamePage from '@/views/Match3GamePage.vue'
import LevelResultPage from '@/views/LevelResultPage.vue'
import ProfilePage from '@/views/ProfilePage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import StatisticsPage from '@/views/StatisticsPage.vue'
import HowToPlayPage from '@/views/HowToPlayPage.vue'
import ShopPage from '@/views/ShopPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'menu', component: MainMenuPage },
    { path: '/levels', name: 'levels', component: LevelSelectPage },
    { path: '/play/:id', name: 'play', component: Match3GamePage, props: true },
    { path: '/result', name: 'result', component: LevelResultPage },
    { path: '/profile', name: 'profile', component: ProfilePage },
    { path: '/settings', name: 'settings', component: SettingsPage },
    { path: '/statistics', name: 'statistics', component: StatisticsPage },
    { path: '/how-to-play', name: 'how-to-play', component: HowToPlayPage },
    { path: '/shop', name: 'shop', component: ShopPage },
    { path: '/:pathMatch(.*)*', redirect: { name: 'menu' } },
  ],
})

export default router
