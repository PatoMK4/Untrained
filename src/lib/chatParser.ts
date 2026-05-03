import type { ParsedLog, Effort } from '@/types/app.types'

// Extracts a rep count from a message even when written naturally
function extractReps(low: string): number | null {
  // "did 8", "got 8", "8 reps", "8", "knocked out 8", "managed 8"
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
  if (/\b(?:easy|light|comfortable|smooth|effortless|breezy|piece of cake|too easy|felt nothing|no problem|np)\b/.test(low)) return 'easy'
  if (/\b(?:hard|tough|brutal|dying|struggle[ds]?|couldn'?t|failed|heavy|rough|rough one|killed me|murdered|destroyed|max|pr|pb|personal best|personal record|grind|grinded)\b/.test(low)) return 'hard'
  if (/\b(?:medium|okay|ok|alright|solid|good|decent|moderate|fine|felt good|felt ok|manageable|average|normal|standard)\b/.test(low)) return 'medium'
  return null
}

export function parseMessage(msg: string): ParsedLog {
  const low = msg.toLowerCase().trim()

  // Done / next signals
  if (/^(?:done|next|finished?|complete[d]?|that'?s it|all done|end|moving on|on to the next|ready|let'?s go|go)\s*[!.]*$/.test(low)) {
    return { type: 'done' }
  }

  // Pain / injury signals — caught here so Lite can respond specifically
  if (/\b(?:hurt[s]?|pain|sore|ache[s]?|tight(?:ness)?|twinge|pulled|strain|injured?|uncomfortable|sharp|burning|weird feeling|doesn'?t feel right)\b/.test(low)) {
    return { type: 'unknown' } // handled by hasPainSignal separately
  }

  // Weight mentioned — check before reps so "added 10kg" isn't parsed as reps
  const weight = extractWeight(low)
  if (weight !== null) return { type: 'weight', weightKg: weight }

  // Reps + effort in same message: "8 reps, felt easy" / "got 8, hard"
  const reps = extractReps(low)
  const effort = extractEffort(low)
  if (reps !== null && effort !== null) return { type: 'reps', reps, effort }
  if (reps !== null) return { type: 'reps', reps }
  if (effort !== null) return { type: 'effort', effort }

  // Rest request
  if (/\b(?:rest|break|wait|give me a (?:sec|minute|moment)|breather|pause)\b/.test(low)) return { type: 'rest' }

  // Skip request
  if (/\b(?:skip|can'?t do(?: this)?|not today|pass|no thanks|impossible|too hard|hate this)\b/.test(low)) return { type: 'skip' }

  // Motivation signals
  if (/\b(?:tired|exhausted|don'?t want to|not feeling it|struggling today|bad day|no energy|drained|burnt? out)\b/.test(low)) {
    return { type: 'unknown' } // useChat will handle with motivation response
  }

  return { type: 'unknown' }
}