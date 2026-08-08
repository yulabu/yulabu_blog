import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login as loginApi } from '@/api/auth'
import { getCurrentAdmin } from '@/api/admin'
import type { LoginForm, Admin } from '@/types/api'

const TOKEN_KEY = 'token'
const ADMIN_KEY = 'admin'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const admin = ref<Admin | null>(null)
  const isReady = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  function readStoredAdmin() {
    try {
      const raw = localStorage.getItem(ADMIN_KEY)
      admin.value = raw ? JSON.parse(raw) : null
    } catch {
      admin.value = null
    }
  }

  function hydrate() {
    token.value = localStorage.getItem(TOKEN_KEY)
    readStoredAdmin()
    isReady.value = true
  }

  async function login(form: LoginForm) {
    const data = await loginApi(form)
    token.value = data.token
    admin.value = data.admin
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin))
    return data
  }

  async function refreshProfile() {
    if (!isLoggedIn.value) return
    const profile = await getCurrentAdmin()
    updateProfile(profile)
  }

  function logout() {
    token.value = null
    admin.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_KEY)
  }

  function updateProfile(profile: Admin) {
    admin.value = profile
    localStorage.setItem(ADMIN_KEY, JSON.stringify(profile))
  }

  return {
    token,
    admin,
    isReady,
    isLoggedIn,
    hydrate,
    login,
    refreshProfile,
    logout,
    updateProfile
  }
})
