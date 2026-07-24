import { createRouter, createWebHistory } from 'vue-router';

// 首屏必须快的页面：静态导入
import LoginView from '../views/LoginView.vue';
import HomeView from '../views/HomeView.vue';

// 前台其他页面：懒加载
const PostDetailView = () => import('../views/PostDetailView.vue');

// 后台所有组件：统一打包到 admin chunk，按需加载
const AdminLayout = () => import(/* webpackChunkName: "admin" */ '../components/AdminLayout.vue');
const AdminDashboard = () => import(/* webpackChunkName: "admin" */ '../views/AdminDashboard.vue');
const AdminPostList = () => import(/* webpackChunkName: "admin" */ '../views/AdminPostList.vue');
const AdminPostEdit = () => import(/* webpackChunkName: "admin" */ '../views/AdminPostEdit.vue');
const AdminTagList = () => import(/* webpackChunkName: "admin" */ '../views/AdminTagList.vue');
const AdminTrash = () => import(/* webpackChunkName: "admin" */ '../views/AdminTrash.vue');
const AdminSettings = () => import(/* webpackChunkName: "admin" */ '../views/AdminSettings.vue');

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