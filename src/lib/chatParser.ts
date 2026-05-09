// src/lib/chatParser.ts
import type { ParsedLog, Effort } from '@/types/app.types'

function extractReps(low: string): number | null {
  const patterns = [
    /(?:did|got|knocked out|completed?|hit|managed|finished?)\s+(\d+)/,
    /(\d+)\s*(?:reps?|repetitions?)/,
    /^(\d+)$/,
    /^(\d+)\s*(?:easy|hard|ok|good|solid|clean)$/,
  ]
  for (const p of patterns) {
    const m = low.match(p)
    if (m) return parseInt(m[1])
  }
  return null
}

function extractWeight(low: string): number | null {
  const m = low.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo(?:gram)?s?|lbs?|pounds?)/)
  return m ? parseFloat(m[1]) : null
}

function extractEffort(low: string): Effort | null {
  if (/\b(?:easy|light|comfortable|smooth|effortless|too easy|felt nothing|no problem|np)\b/.test(low)) return 'easy'
  if (/\b(?:hard|tough|brutal|dying|struggle[ds]?|couldn'?t|failed|heavy|rough|killed me|destroyed|max|pr|pb|personal best|personal record)\b/.test(low)) return 'hard'
  if (/\b(?:medium|okay|ok|alright|solid|good|decent|moderate|fine|felt good|felt ok|manageable|average|normal|standard|pretty hard|fairly hard|kinda hard|kinda easy|fairly easy)\b/.test(low)) return 'medium'
  return null
}

export function parseMessage(msg: string): ParsedLog {
  const low = msg.toLowerCase().trim()

  if (/^(?:done|next|finished?|complete[d]?|that'?s it|all done|end|moving on|ready|let'?s go|go)\s*[!.]*$/.test(low)) {
    return { type: 'done' }
  }

  if (/\b(?:hurt[s]?|pain|sore|ache[s]?|tight(?:ness)?|twinge|pulled|strain|injured?|sharp|burning|doesn'?t feel right)\b/.test(low)) {
    return { type: 'unknown' }
  }

  if (/\b(?:rest|break|wait|give me a (?:sec|minute|moment)|breather|pause)\b/.test(low)) {
    return { type: 'rest' }
  }

  if (/\b(?:skip|can'?t do(?: this)?|not today|pass|no thanks|impossible|too hard|hate this)\b/.test(low)) {
    return { type: 'skip' }
  }

  // Check reps+effort BEFORE weight — "12 reps with 10kg pretty hard" should log reps
  const reps = extractReps(low)
  const effort = extractEffort(low)

  if (reps !== null && effort !== null) return { type: 'reps', reps, effort }
  if (reps !== null) return { type: 'reps', reps }
  if (effort !== null) return { type: 'effort', effort }

  // Weight only if no reps found
  const weight = extractWeight(low)
  if (weight !== null) return { type: 'weight', weightKg: weight }

  return { type: 'unknown' }
}