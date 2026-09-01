export type MapLocationId = 'home' | 'columns' | 'friends' | 'archive' | 'about'

export interface MapLocationPosition {
  x: number
  y: number
}

export interface MapLocation {
  id: MapLocationId
  name: string
  desc: string
  icon: string
  position: MapLocationPosition
  route: string
}
