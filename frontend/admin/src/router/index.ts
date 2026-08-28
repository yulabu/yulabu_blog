import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

import LoginView from '@/views/LoginView.vue';

const AdminLayout = () => import(/* webpackChunkName: "admin" */ '@/components/admin/AdminLayout.vue');
const AdminDashboard = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminDashboard.vue');
const AdminPostList = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminPostList.vue');
const AdminPostEdit = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminPostEdit.vue');
const AdminTagList = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminTagList.vue');
const AdminNoticeList = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminNoticeList.vue');
const AdminNoticeEdit = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminNoticeEdit.vue');
const AdminUserList = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminUserList.vue');
const AdminSettings = () => import(/* webpackChunkName: "admin" */ '@/views/admin/AdminSettings.vue');
const AdminFriendLinkList = () => import('@/views/admin/AdminFriendLinkList.vue');
const AdminColumnList = () => import('@/views/admin/AdminColumnList.vue');
const AdminColumnEdit = () => import('@/views/admin/AdminColumnEdit.vue');
const AdminColumnPosts = () => import('@/views/admin/AdminColumnPosts.vue');

const routes = [
  { path: '/', redirect: '/admin' },
  { path: '/login', name: 'Login', component: LoginView },
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true, title: '后台管理' },
    children: [
      { path: 'dashboard', component: AdminDashboard },
      { path: 'posts', component: AdminPostList },
      { path: 'posts/new', component: AdminPostEdit },
      { path: 'posts/:id/edit', component: AdminPostEdit },
      { path: 'tags', component: AdminTagList },
      { path: 'notices', component: AdminNoticeList },
      { path: 'notices/new', component: AdminNoticeEdit },
      { path: 'notices/:id/edit', component: AdminNoticeEdit },
      { path: 'users', component: AdminUserList },
      { path: 'friendlinks', component: AdminFriendLinkList },
      { path: 'columns', component: AdminColumnList },
      { path: 'columns/new', component: AdminColumnEdit },
      { path: 'columns/:id/edit', component: AdminColumnEdit },
      { path: 'columns/:id/posts', component: AdminColumnPosts },
      { path: 'settings', component: AdminSettings }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/admin' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  authStore.hydrate();

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login');
    return;
  }

  document.title = (to.meta.title as string) || '后台管理';
  next();
});

export default router;
