// src/services/themePackService.ts
import { THEME_PACKS } from '../config/themePacks'
import type { ThemePack, ThemeCharacter } from '../types/themePack'

/** 获取所有主题包 */
export function getAllThemePacks(): ThemePack[] {
  return THEME_PACKS
}

/** 根据 ID 获取主题包 */
export function getThemePack(id: string): ThemePack | undefined {
  return THEME_PACKS.find(p => p.id === id)
}

/** 获取所有名人角色（去重） */
export function getAllThemeCharacters(): ThemeCharacter[] {
  const seen = new Set<string>()
  const chars: ThemeCharacter[] = []
  for (const pack of THEME_PACKS) {
    if (!seen.has(pack.affirm.id)) {
      seen.add(pack.affirm.id)
      chars.push(pack.affirm)
    }
    if (!seen.has(pack.negate.id)) {
      seen.add(pack.negate.id)
      chars.push(pack.negate)
    }
  }
  return chars
}
