import type { ParsedLog } from '@/types/app.types'
export function parseMessage(msg: string): ParsedLog {
  const low = msg.toLowerCase().trim()
  if (/^(done|next|finished|complete|that'?s it|all done|end)$/.test(low)) return { type: 'done' }
  const wMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|lbs?)/)
  if (wMatch) return { type: 'weight', weightKg: parseFloat(wMatch[1]) }
  const repMatch = low.match(/(?:did|got|managed|completed?)?\s*(\d+)\s*(?:reps?|rep)?/)
  if (repMatch) return { type: 'reps', reps: parseInt(repMatch[1]) }
  if (/easy|light|comfortable|smooth|effortless/.test(low)) return { type: 'effort', effort: 'easy' }
  if (/hard|tough|struggle|struggling|brutal|dying|max|couldn'?t/.test(low)) return { type: 'effort', effort: 'hard' }
  if (/medium|okay|ok|alright|solid|good|decent|moderate/.test(low)) return { type: 'effort', effort: 'medium' }
  if (/rest|break|minute|second/.test(low)) return { type: 'rest' }
  if (/skip|can'?t|not today|skip this/.test(low)) return { type: 'skip' }
  return { type: 'unknown' }
}
