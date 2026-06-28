import { create } from 'zustand'
import type {
  DebateRoom, DebateSpeech, RoundJudgment, DebateSummary, LobbyRoom,
} from '../types/debate'
import { getCharLimit } from '../types/debate'
import { debateRoomService } from '../services/debateRoomService'
import { useUserStore } from './userStore'

interface DebateState {
  // 大厅
  lobbyRooms: LobbyRoom[]
  isLoadingLobby: boolean

  // 当前房间
  currentRoom: DebateRoom | null
  speeches: DebateSpeech[]
  judgments: RoundJudgment[]
  summary: DebateSummary | null

  // 用户状态
  mySeatIndex: number | null
  isOnStage: boolean

  // UI 状态
  isLoadingRoom: boolean
  hasFetchedRoom: boolean
  isSpeaking: boolean
  isJudging: boolean
  currentCharLimit: number

  // Actions
  fetchLobbyRooms: () => Promise<void>
  fetchRoom: (roomId: string) => Promise<void>
  joinRoom: (roomId: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  submitSpeech: (content: string) => Promise<boolean>
  startNewRound: () => Promise<RoundJudgment | null>
  castRemovalVote: (targetSeatIndex: number) => Promise<boolean>
  requestSummary: () => Promise<DebateSummary | null>
  resetRoom: () => void
}

export const useDebateStore = create<DebateState>((set, get) => ({
  lobbyRooms: [],
  isLoadingLobby: false,
  currentRoom: null,
  speeches: [],
  judgments: [],
  summary: null,
  mySeatIndex: null,
  isOnStage: false,
  isLoadingRoom: false,
  hasFetchedRoom: false,
  isSpeaking: false,
  isJudging: false,
  currentCharLimit: 150,

  fetchLobbyRooms: async () => {
    set({ isLoadingLobby: true })
    try {
      const rooms = await debateRoomService.getRooms()
      set({ lobbyRooms: rooms })
    } finally {
      set({ isLoadingLobby: false })
    }
  },

  fetchRoom: async (roomId: string) => {
    set({ isLoadingRoom: true, hasFetchedRoom: false })
    try {
      // 先获取房间（可能会动态创建），再获取发言和评分
      const room = await debateRoomService.getRoom(roomId)
      if (!room) {
        set({ currentRoom: null, hasFetchedRoom: true })
        return
      }

      const [speeches, judgments] = await Promise.all([
        debateRoomService.getSpeeches(roomId),
        debateRoomService.getJudgments(roomId),
      ])

      const userId = useUserStore.getState().user.id
      const mySeat = room.seats.find(s => s.userId === userId)
      const charLimit = room.currentPhase
        ? getCharLimit(room.currentPhase, room.rules)
        : 150

      set({
        currentRoom: room,
        speeches: speeches || [],
        judgments: judgments || [],
        mySeatIndex: mySeat?.index ?? null,
        isOnStage: !!mySeat,
        currentCharLimit: charLimit,
        summary: null,
        hasFetchedRoom: true,
      })
    } finally {
      set({ isLoadingRoom: false })
    }
  },

  joinRoom: async (roomId: string) => {
    const room = get().currentRoom
    if (!room) return false

    const user = useUserStore.getState().user
    const cost = room.currentEntryCost

    if (user.points < cost) {
      return false
    }

    // 扣积分
    useUserStore.getState().addPoints(-cost, 'debate_entry', `辩论入场: ${room.topic}`)

    const result = await debateRoomService.joinRoom(roomId, user.id, user.nickname, user.avatar)
    if (result) {
      set({
        currentRoom: result.room,
        mySeatIndex: result.seatIndex,
        isOnStage: true,
      })
      return true
    }
    return false
  },

  leaveRoom: async () => {
    const room = get().currentRoom
    if (!room) return

    const userId = useUserStore.getState().user.id
    const result = await debateRoomService.leaveRoom(room.id, userId)
    if (result) {
      set({
        currentRoom: result,
        mySeatIndex: null,
        isOnStage: false,
      })
    }
  },

  submitSpeech: async (content: string) => {
    const room = get().currentRoom
    if (!room) return false

    const user = useUserStore.getState().user
    set({ isSpeaking: true })

    try {
      const result = await debateRoomService.submitSpeech(
        room.id, user.id, user.nickname, user.avatar, content,
      )

      if (result) {
        set(state => ({
          speeches: [...state.speeches, result.speech],
        }))
        return true
      }
      return false
    } finally {
      set({ isSpeaking: false })
    }
  },

  startNewRound: async () => {
    const room = get().currentRoom
    if (!room) return null

    set({ isJudging: true })
    try {
      const result = await debateRoomService.startNewRound(room.id)
      if (result.room) {
        const charLimit = getCharLimit(result.room.currentPhase, result.room.rules)
        set({
          currentRoom: result.room,
          currentCharLimit: charLimit,
        })
      }
      return result.judgment
    } finally {
      set({ isJudging: false })
    }
  },

  castRemovalVote: async (targetSeatIndex: number) => {
    const room = get().currentRoom
    if (!room) return false

    const userId = useUserStore.getState().user.id
    const result = await debateRoomService.castRemovalVote(room.id, userId, targetSeatIndex)

    if (result.room) {
      set({ currentRoom: result.room })

      // 如果被抬走的是自己
      const mySeat = result.room.seats.find(s => s.userId === userId)
      if (!mySeat) {
        set({ mySeatIndex: null, isOnStage: false })
      }
    }

    return result.removed
  },

  requestSummary: async () => {
    const room = get().currentRoom
    if (!room) return null

    const summary = await debateRoomService.requestSummary(room.id)
    if (summary) {
      set({ summary, currentRoom: { ...room, status: 'ended' } })
    }
    return summary
  },

  resetRoom: () => {
    set({
      currentRoom: null,
      speeches: [],
      judgments: [],
      summary: null,
      mySeatIndex: null,
      isOnStage: false,
      isSpeaking: false,
      isJudging: false,
      currentCharLimit: 150,
      hasFetchedRoom: false,
    })
  },
}))
