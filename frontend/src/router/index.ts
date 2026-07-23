import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import HomeView from '../views/HomeView.vue';
import PostDetailView from '../views/PostDetailView.vue';
import AdminLayout from '../components/AdminLayout.vue';
import AdminPostList from '../views/AdminPostList.vue';
import AdminPostEdit from '../views/AdminPostEdit.vue';
import AdminTagList from '../views/AdminTagList.vue';
import AdminDashboard from '../views/AdminDashboard.vue';
import AdminSettings from '../views/AdminSettings.vue';
import AdminTrash from '../views/AdminTrash.vue';

const routes = [
  { path: '/', redirect: '/home' },           // 默认跳转到登录页
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/home', name: 'Home', component: HomeView },
  { path: '/post/:id', name: 'PostDetail', component: PostDetailView },
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', component: AdminDashboard },
      { path: 'posts', component: AdminPostList },
      { path: 'posts/new', component: AdminPostEdit },
      { path: 'posts/:id/edit', component: AdminPostEdit },
      { path: 'tags', component: AdminTagList },
      { path: 'trash', component: AdminTrash },
      { path: 'settings', component: AdminSettings }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),  // 使用 History 模式
  routes
});

// 路由守卫：保护需要登录的页面
router.beforeEach((to, from, next) => {
  const isLoggedIn = !!localStorage.getItem('token');
  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login');
  } else {
    next();
  }
});

export default router;