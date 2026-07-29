import http from '@/utils/http'
import type { LoginForm, LoginResult } from '@/types/api'

export function login(form: LoginForm) {
  return http.post<LoginResult>('/auth/login', form)
}
