import type {
  Melon,
  Evidence,
  Report,
  User,
  Comment,
  ApiMelon,
  ApiEvidence,
  ApiReport,
  ApiUser,
  ApiComment,
  UserStats,
  ApiPointsRecord,
  PointsRecord,
  ApiGuess,
  Guess,
  MelonCategory,
  Rank,
} from '../types'

export function transformMelon(apiMelon: ApiMelon): Melon {
  return {
    id: String(apiMelon.id),
    title: apiMelon.title,
    description: apiMelon.description,
    coverImage: apiMelon.cover_image || '',
    category: apiMelon.category as MelonCategory,
    difficulty: 2,
    trueCount: apiMelon.true_count || 0,
    falseCount: apiMelon.false_count || 0,
    totalParticipants: apiMelon.participant_count || 0,
    revealTime: apiMelon.reveal_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: apiMelon.status === 'revealed' ? 'revealed' : 'pending',
    result: apiMelon.result ?? undefined,
    likeCount: apiMelon.like_count || 0,
    commentCount: apiMelon.comment_count || 0,
    evidenceCount: apiMelon.evidence_count || 0,
    isLiked: apiMelon.is_liked || false,
    createdAt: apiMelon.created_at,
  }
}

export function transformMelonList(items: ApiMelon[]): Melon[] {
  return items.map(transformMelon)
}

export function transformEvidence(apiEvidence: ApiEvidence): Evidence {
  return {
    id: String(apiEvidence.id),
    melonId: String(apiEvidence.melon_id),
    userId: String(apiEvidence.user_id),
    userNickname: apiEvidence.user_nickname,
    userAvatar: apiEvidence.user_avatar,
    direction: apiEvidence.direction,
    content: apiEvidence.content,
    upvotes: apiEvidence.upvotes,
    downvotes: apiEvidence.downvotes,
    isBest: apiEvidence.is_best,
    guessId: '',
    createdAt: apiEvidence.created_at,
  }
}

export function transformEvidenceList(items: ApiEvidence[]): Evidence[] {
  return items.map(transformEvidence)
}

export function transformReport(apiReport: ApiReport): Report {
  return {
    id: String(apiReport.melon_id),
    melonId: String(apiReport.melon_id),
    timeline: apiReport.timeline.map(t => ({
      time: t.time,
      event: t.event,
      source: t.source,
    })),
    evidenceChain: apiReport.evidence_chain.map(e => ({
      description: e.description,
      source: e.source,
      sourceUrl: '',
      credibility: e.credibility as 1 | 2 | 3 | 4 | 5,
    })),
    keyDoubts: apiReport.key_doubts,
    tendency: apiReport.tendency,
    tendencyDirection: apiReport.tendency_direction,
    disclaimer: apiReport.disclaimer,
    generatedAt: new Date().toISOString(),
  }
}

export function transformUser(apiUser: ApiUser): User {
  return {
    id: String(apiUser.id),
    nickname: apiUser.nickname,
    avatar: apiUser.avatar,
    rank: apiUser.rank as Rank,
    points: apiUser.points,
    totalGuesses: apiUser.total_guesses,
    correctGuesses: apiUser.correct_guesses,
    badges: [],
    createdAt: apiUser.created_at,
  }
}

export function transformGuess(apiGuess: ApiGuess): Guess {
  return {
    id: String(apiGuess.id),
    userId: '',
    melonId: String(apiGuess.melon_id),
    choice: apiGuess.choice,
    guessedAt: apiGuess.guessed_at,
    isCorrect: apiGuess.is_correct ?? undefined,
    pointsEarned: apiGuess.points_earned,
  }
}

export function transformPointsRecord(apiRecord: ApiPointsRecord): PointsRecord {
  return {
    id: String(apiRecord.id),
    userId: '',
    amount: apiRecord.amount,
    type: apiRecord.type as PointsRecord['type'],
    description: apiRecord.description,
    createdAt: apiRecord.created_at,
  }
}

export function transformPointsRecords(items: ApiPointsRecord[]): PointsRecord[] {
  return items.map(transformPointsRecord)
}

export function applyStatsToUser(user: User, stats: UserStats): User {
  return {
    ...user,
    rank: stats.rank as Rank,
    points: stats.points,
    totalGuesses: stats.total_guesses,
    correctGuesses: stats.correct_guesses,
  }
}

export function transformComment(apiComment: ApiComment): Comment {
  return {
    id: String(apiComment.id),
    userId: String(apiComment.user_id),
    userNickname: apiComment.user_nickname,
    userAvatar: apiComment.user_avatar,
    melonId: String(apiComment.melon_id),
    content: apiComment.content,
    parentId: apiComment.parent_id ? String(apiComment.parent_id) : null,
    replyToUser: apiComment.reply_to_user || '',
    likes: apiComment.likes || 0,
    isLiked: apiComment.is_liked || false,
    createdAt: apiComment.created_at,
  }
}

export function transformCommentList(items: ApiComment[]): Comment[] {
  return items.map(transformComment)
}

/** Organize flat comment list into tree structure (top-level + nested replies) */
export function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>()
  const roots: Comment[] = []

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] })
  }

  for (const c of comments) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
