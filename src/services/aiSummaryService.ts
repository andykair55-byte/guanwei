import { callLLM } from '../stores/llmStore'

/**
 * AI Summary Service for Debate Arena
 * Generates comprehensive summaries with MVP selection and winner declaration
 */

export interface SummaryInput {
  topic: string
  affirmLabel: string
  negateLabel: string
  totalRounds: number
  allSpeeches: { 
    round: number
    seatIndex: number
    nickname: string
    side: 'affirm' | 'negate'
    content: string 
  }[]
  allJudgments: { 
    round: number
    seatScores: { 
      seatIndex: number
      nickname: string
      score: number 
    }[]
    roundWinner: string 
  }[]
}

export interface SummaryResult {
  winner: 'affirm' | 'negate' | 'draw'
  keyArguments: { 
    side: 'affirm' | 'negate'
    seatIndex: number
    nickname: string
    argument: string 
  }[]
  mvpUserId: string
  mvpNickname: string
  affirmTotalScore: number
  negateTotalScore: number
  summaryText: string
}

/**
 * Generate debate summary using LLM API with mock fallback
 */
export async function generateSummary(input: SummaryInput): Promise<SummaryResult> {
  try {
    return await generateLLMSummary(input)
  } catch (error) {
    console.error('LLM failed, falling back to mock summary:', error)
    return generateMockSummary(input)
  }
}

/**
 * Generate summary using LLM API
 */
async function generateLLMSummary(input: SummaryInput): Promise<SummaryResult> {
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(input)

  const content = await callLLM(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    { temperature: 0.4 }
  )

  if (!content) {
    throw new Error('No content in LLM response')
  }

  const parsed = JSON.parse(content)
  return validateAndTransformResponse(parsed, input)
}

/**
 * Build system prompt for LLM API
 */
function buildSystemPrompt(): string {
  return `You are an expert debate analyst and summarizer. Your task is to analyze a complete debate and provide a comprehensive summary.

You will receive:
- The debate topic and positions (affirm vs negate)
- All speeches from each round
- All judge scores and round winners

Your analysis must include:
1. **Key Arguments**: Select 3-4 of the most compelling arguments from the debate, balanced between both sides (at least 1-2 from each side). Focus on arguments that were well-delivered and scored highly.

2. **MVP Selection**: Identify the Most Valuable Player - the debater with the highest total score across all rounds.

3. **Winner Declaration**: Determine the overall winner based on total accumulated scores.

4. **Narrative Summary**: Write a 2-3 paragraph summary that:
   - Introduces the debate topic and positions
   - Highlights the key moments and strongest arguments from each side
   - Concludes with the outcome and why the winner prevailed

Output your analysis as a JSON object with this exact structure:
{
  "winner": "affirm" | "negate" | "draw",
  "keyArguments": [
    {
      "side": "affirm" | "negate",
      "seatIndex": number,
      "nickname": string,
      "argument": string (1-2 sentence summary of the argument)
    }
  ],
  "mvpUserId": string (seatIndex as string),
  "mvpNickname": string,
  "affirmTotalScore": number,
  "negateTotalScore": number,
  "summaryText": string (2-3 paragraphs)
}

Be objective, analytical, and fair to both sides. Focus on the quality of arguments and evidence presented.`
}

/**
 * Build user prompt with debate data
 */
function buildUserPrompt(input: SummaryInput): string {
  const speechesText = input.allSpeeches
    .map(s => `Round ${s.round}, ${s.side === 'affirm' ? input.affirmLabel : input.negateLabel} (${s.nickname}): ${s.content}`)
    .join('\n\n')

  const judgmentsText = input.allJudgments
    .map(j => {
      const scores = j.seatScores.map(s => `${s.nickname}: ${s.score}`).join(', ')
      return `Round ${j.round} - Scores: ${scores} | Winner: ${j.roundWinner}`
    })
    .join('\n')

  return `Debate Topic: ${input.topic}

Affirm Position: ${input.affirmLabel}
Negate Position: ${input.negateLabel}
Total Rounds: ${input.totalRounds}

=== ALL SPEECHES ===
${speechesText}

=== JUDGE SCORES ===
${judgmentsText}

Please analyze this debate and provide your summary in the required JSON format.`
}

/**
 * Validate and transform LLM API response
 */
function validateAndTransformResponse(parsed: any, _input: SummaryInput): SummaryResult {
  // Validate required fields
  if (!parsed.winner || !['affirm', 'negate', 'draw'].includes(parsed.winner)) {
    throw new Error('Invalid winner field in response')
  }

  if (!Array.isArray(parsed.keyArguments) || parsed.keyArguments.length === 0) {
    throw new Error('Invalid keyArguments field in response')
  }

  if (!parsed.mvpUserId || !parsed.mvpNickname) {
    throw new Error('Invalid MVP fields in response')
  }

  if (typeof parsed.affirmTotalScore !== 'number' || typeof parsed.negateTotalScore !== 'number') {
    throw new Error('Invalid score fields in response')
  }

  if (!parsed.summaryText || typeof parsed.summaryText !== 'string') {
    throw new Error('Invalid summaryText field in response')
  }

  return {
    winner: parsed.winner,
    keyArguments: parsed.keyArguments.map((arg: any) => ({
      side: arg.side,
      seatIndex: arg.seatIndex,
      nickname: arg.nickname,
      argument: arg.argument
    })),
    mvpUserId: parsed.mvpUserId,
    mvpNickname: parsed.mvpNickname,
    affirmTotalScore: parsed.affirmTotalScore,
    negateTotalScore: parsed.negateTotalScore,
    summaryText: parsed.summaryText
  }
}

/**
 * Generate mock summary as fallback
 */
function generateMockSummary(input: SummaryInput): SummaryResult {
  // Calculate total scores for each side
  const affirmScores: number[] = []
  const negateScores: number[] = []
  const debaterScores = new Map<string, { total: number; count: number; nickname: string; seatIndex: number }>()

  input.allJudgments.forEach(judgment => {
    judgment.seatScores.forEach(score => {
      const speech = input.allSpeeches.find(s => 
        s.round === judgment.round && s.seatIndex === score.seatIndex
      )
      
      if (speech) {
        if (speech.side === 'affirm') {
          affirmScores.push(score.score)
        } else {
          negateScores.push(score.score)
        }

        const key = `${speech.side}-${score.seatIndex}`
        const existing = debaterScores.get(key) || { total: 0, count: 0, nickname: score.nickname, seatIndex: score.seatIndex }
        existing.total += score.score
        existing.count += 1
        debaterScores.set(key, existing)
      }
    })
  })

  const affirmTotalScore = affirmScores.reduce((sum, score) => sum + score, 0)
  const negateTotalScore = negateScores.reduce((sum, score) => sum + score, 0)

  // Determine winner
  let winner: 'affirm' | 'negate' | 'draw'
  if (affirmTotalScore > negateTotalScore) {
    winner = 'affirm'
  } else if (negateTotalScore > affirmTotalScore) {
    winner = 'negate'
  } else {
    winner = 'draw'
  }

  // Find MVP (highest average score)
  let mvpKey = ''
  let mvpAvg = 0
  debaterScores.forEach((data, key) => {
    const avg = data.total / data.count
    if (avg > mvpAvg) {
      mvpAvg = avg
      mvpKey = key
    }
  })

  const mvpData = debaterScores.get(mvpKey)
  const mvpUserId = mvpData ? mvpData.seatIndex.toString() : '0'
  const mvpNickname = mvpData ? mvpData.nickname : 'Unknown'

  // Generate key arguments (first speech from each side)
  const keyArguments: { side: 'affirm' | 'negate'; seatIndex: number; nickname: string; argument: string }[] = []
  
  const firstAffirm = input.allSpeeches.find(s => s.side === 'affirm')
  if (firstAffirm) {
    keyArguments.push({
      side: 'affirm',
      seatIndex: firstAffirm.seatIndex,
      nickname: firstAffirm.nickname,
      argument: firstAffirm.content.substring(0, 150) + (firstAffirm.content.length > 150 ? '...' : '')
    })
  }

  const firstNegate = input.allSpeeches.find(s => s.side === 'negate')
  if (firstNegate) {
    keyArguments.push({
      side: 'negate',
      seatIndex: firstNegate.seatIndex,
      nickname: firstNegate.nickname,
      argument: firstNegate.content.substring(0, 150) + (firstNegate.content.length > 150 ? '...' : '')
    })
  }

  // Generate template summary
  const winnerLabel = winner === 'draw' ? 'It was a draw' : `The ${winner === 'affirm' ? input.affirmLabel : input.negateLabel} side won`
  
  const summaryText = `The debate on "${input.topic}" featured ${input.totalRounds} rounds of intense argumentation between the ${input.affirmLabel} (affirm) and ${input.negateLabel} (negate) positions. Both sides presented compelling arguments and engaged in rigorous back-and-forth discussion.

${winnerLabel} with a final score of ${affirmTotalScore} to ${negateTotalScore}. ${mvpNickname} was named MVP for their outstanding performance throughout the debate, demonstrating strong argumentation and persuasive delivery.

Overall, the debate showcased thoughtful analysis from both sides, with each team presenting well-reasoned positions on this complex topic.`

  return {
    winner,
    keyArguments,
    mvpUserId,
    mvpNickname,
    affirmTotalScore,
    negateTotalScore,
    summaryText
  }
}
