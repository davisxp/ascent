/**
 * Central registries — routes, nav items, zustand slices.
 * Features register here so slices stay decoupled.
 */

import type { ComponentType } from 'react'

export interface RouteEntry {
  path: string
  element: ComponentType
  label: string
  icon?: string
  requireOnboarding?: boolean
}

export interface NavItem {
  id: string
  label: string
  href: string
  icon: string
  mobileOnly?: boolean
  desktopOnly?: boolean
}

export interface ZustandSlice {
  name: string
  create: () => unknown
}

export interface RouteRegistry {
  routes: RouteEntry[]
  register(route: RouteEntry): void
  getByPath(path: string): RouteEntry | undefined
}

export interface NavRegistry {
  items: NavItem[]
  register(item: NavItem): void
  getMobile(): NavItem[]
  getDesktop(): NavItem[]
}

export interface SliceRegistry {
  slices: ZustandSlice[]
  register(slice: ZustandSlice): void
}

export const routeRegistry: RouteRegistry = {
  routes: [],
  register(route) {
    this.routes.push(route)
  },
  getByPath(path) {
    return this.routes.find((r) => r.path === path)
  },
}

export const navRegistry: NavRegistry = {
  items: [],
  register(item) {
    this.items.push(item)
  },
  getMobile() {
    return this.items.filter((i) => !i.desktopOnly)
  },
  getDesktop() {
    return this.items.filter((i) => !i.mobileOnly)
  },
}

export const sliceRegistry: SliceRegistry = {
  slices: [],
  register(slice) {
    this.slices.push(slice)
  },
}
