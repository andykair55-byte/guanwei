// src/types/themePack.ts

/** 名人主题角色 */
export interface ThemeCharacter {
  id: string
  name: string
  era: string
  stanceHint: string
  systemPrompt: string
  avatar: string
  tags: string[]
}

/** 名人主题包（角色对 + 辩题） */
export interface ThemePack {
  id: string
  title: string
  description: string
  affirm: ThemeCharacter
  negate: ThemeCharacter
  topics: ThemeTopic[]
}

/** 主题辩题 */
export interface ThemeTopic {
  id: string
  title: string
  affirmLabel: string
  negateLabel: string
}
