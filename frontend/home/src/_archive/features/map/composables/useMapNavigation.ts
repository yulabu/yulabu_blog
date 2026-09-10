import { useRouter } from 'vue-router'
import { useMapCamera } from './useMapCamera'
import type { MapLocation } from '../map-types'
import type { Ref } from 'vue'

export function useMapNavigation(worldRef: Ref<SVGGElement | null>) {
  const router = useRouter()
  const camera = useMapCamera(worldRef)

  async function navigateTo(location: MapLocation) {
    await camera.focus(location.position)
    await router.push(location.route)
  }

  return {
    navigateTo,
    camera
  }
}
