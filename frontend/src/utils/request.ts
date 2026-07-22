export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token || ''}`,
    ...((options.headers as Record<string, string>) || {})
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const res = await fetch(url, {
    ...options,
    headers
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('登录已过期，请重新登录')
  }

  return res
}
