import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'

const PostDetailView = () => import('@/views/PostDetailView.vue')
const ArchiveView = () => import('@/views/ArchiveView.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: PostDetailView,
  },
  {
    path: '/archive',
    name: 'Archive',
    component: ArchiveView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

export default router
