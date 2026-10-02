import { apiGet } from './client'

/** 公开设置项（后端 config/settings.js 的 PUBLIC_KEYS，缺行即用默认值） */
export interface PublicSettings {
  comments_enabled: boolean
}

/** 取不到时按「评论开启」处理（fail-soft，与其它取数一致） */
export function getPublicSettings() {
  return apiGet<PublicSettings>('/settings')
}
