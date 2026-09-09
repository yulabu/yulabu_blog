import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

// 请求拦截器：注入 token，处理 JSON 请求头
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.data && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
})

// 响应拦截器：透传完整 response，错误统一抛出
instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const status = error.response?.status
    let payload = error.response?.data
    // 下载接口以 blob 接收响应，后端返回的 JSON 错误体需先解析出 message
    if (payload instanceof Blob && payload.type.includes('application/json')) {
      try {
        payload = JSON.parse(await payload.text())
      } catch {
        // 非 JSON 错误体，保留原 payload
      }
    }
    const msg = payload?.message || error.message || '请求失败'

    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
      window.location.href = '/login'
    }

    return Promise.reject(new Error(msg))
  }
)

const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get<T>(url, config).then((res) => res.data)
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post<T>(url, data, config).then((res) => res.data)
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put<T>(url, data, config).then((res) => res.data)
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete<T>(url, config).then((res) => res.data)
  },
}

export default http
