export interface DegradationState {
  llm: boolean
  search: boolean
  message: string
}

export function createDefaultDegradation(): DegradationState {
  return {
    llm: false,
    search: false,
    message: '',
  }
}
