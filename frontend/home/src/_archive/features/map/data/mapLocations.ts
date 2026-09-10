import type { MapLocation } from '../map-types'

export const MAP_VIEWBOX = {
  width: 2000,
  height: 1200
}

export const mapLocations: MapLocation[] = [
  {
    id: 'home',
    name: '中央花园',
    desc: '博客首页',
    icon: 'material-symbols:home-rounded',
    position: { x: 1000, y: 620 },
    route: '/'
  },
  {
    id: 'columns',
    name: '知识图书馆',
    desc: '专栏文章',
    icon: 'material-symbols:book-rounded',
    position: { x: 620, y: 320 },
    route: '/columns'
  },
  {
    id: 'friends',
    name: '友人村',
    desc: '友情链接',
    icon: 'material-symbols:diversity-3-rounded',
    position: { x: 1460, y: 360 },
    route: '/friends'
  },
  {
    id: 'archive',
    name: '记忆仓库',
    desc: '文章归档',
    icon: 'material-symbols:archive-rounded',
    position: { x: 520, y: 820 },
    route: '/archive'
  },
  {
    id: 'about',
    name: '我的小屋',
    desc: '关于我',
    icon: 'material-symbols:person-rounded',
    position: { x: 1180, y: 880 },
    route: '/about'
  }
]
