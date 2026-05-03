import type { Effort } from '@/types/app.types'

export interface LiteContext {
  exerciseName?: string
  setNumber?: number
  totalSets?: number
  readiness?: 'great' | 'good' | 'tired' | null
  consecutiveHard?: number
  lastReps?: number | null
}

// Pick a random item from an array so responses feel varied
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getRepsResponse(reps: number, effort: Effort | undefined, ctx: LiteContext): string {
  const ex = ctx.exerciseName ? ` on ${ctx.exerciseName}` : ''
  const setInfo = ctx.setNumber && ctx.totalSets
    ? ` Set ${ctx.setNumber} of ${ctx.totalSets} done.`
    : ''

  if (effort === 'easy') {
    return pick([
      `${reps} reps${ex} — logged. Felt easy.${setInfo} Good sign.`,
      `${reps} logged. If it keeps feeling that light, we'll push harder next session.`,
      `${reps} reps — noted. Easy sets like this build the base.${setInfo}`,
    ])
  }

  if (effort === 'hard') {
    const restCue = ctx.consecutiveHard && ctx.consecutiveHard >= 2
      ? ' Take a longer rest — you\'ve earned it.'
      : ' Rest fully before the next set.'
    return pick([
      `${reps} reps — logged. That was a tough one.${restCue}`,
      `${reps}. Hard set.${restCue}`,
      `Logged — ${reps} reps${ex}. When it gets that hard, rest counts as training.${restCue}`,
    ])
  }

  return pick([
    `${reps} reps — logged.${setInfo}`,
    `${reps}${ex} — noted.${setInfo}`,
    `Got it — ${reps} reps logged.${setInfo}`,
  ])
}

export function getEffortResponse(effort: Effort, ctx: LiteContext): string {
  if (effort === 'easy') {
    return pick([
      'Easy — noted. Rest shorter and stay sharp.',
      'Good. If it keeps feeling light we\'ll step up next session.',
      'Easy set. Rest less, keep the intensity up.',
    ])
  }

  if (effort === 'hard') {
    const extra = ctx.consecutiveHard && ctx.consecutiveHard >= 3
      ? ' Three hard sets in a row — your body is telling you something. Rest longer.'
      : ''
    return pick([
      `Hard one. Rest fully before the next.${extra}`,
      `Tough set — noted. Don\'t rush the rest.${extra}`,
      `That tracks. Hard sets are where adaptation happens. Rest well.${extra}`,
    ])
  }

  return pick([
    'Solid. That\'s exactly where you want to be.',
    'Good effort. Stay consistent.',
    'Medium — that\'s the sweet spot. Keep it there.',
  ])
}

export function getWeightResponse(kg: number, ctx: LiteContext): string {
  const ex = ctx.exerciseName ? ` for ${ctx.exerciseName}` : ''
  return pick([
    `${kg}kg${ex} — logged.`,
    `Noted — ${kg}kg added.`,
    `${kg}kg${ex}. Logged.`,
  ])
}

export function getDoneResponse(ctx: LiteContext): string {
  const ex = ctx.exerciseName ? ` ${ctx.exerciseName} done.` : ''
  return pick([
    `${ex} Moving on.`,
    `Good.${ex} Next up.`,
    `Noted.${ex}`,
  ])
}

export function getRestResponse(): string {
  return pick([
    'Take your time.',
    'Rest up — next set when you\'re ready.',
    'Take the time you need. Quality over rush.',
  ])
}

export function getSkipResponse(ctx: LiteContext): string {
  const ex = ctx.exerciseName ? ` ${ctx.exerciseName}` : ' this one'
  return pick([
    `Skipping${ex}. Moving on.`,
    `Got it — skipped.`,
    `Fine. Next exercise.`,
  ])
}

export function getPainResponse(): string {
  // Always calm, never alarming, never diagnostic
  return pick([
    'Noted. Keep going — we\'ll check in properly after the session.',
    'Flagged. Finish what you can and we\'ll look at it at the end.',
    'Got it. Pain signals logged — we\'ll review after.',
  ])
}

export function getMotivationResponse(ctx: LiteContext): string {
  const readinessCue = ctx.readiness === 'tired'
    ? ' You told me you were tired today — that\'s fine. Just show up.'
    : ''
  return pick([
    `You\'re here.${readinessCue} That\'s the whole thing. One set at a time.`,
    `Bad days are part of it.${readinessCue} Get through this session and you\'ll be glad you did.`,
    `Everyone has days like this.${readinessCue} One set. Then another.`,
  ])
}

export function getUnknownResponse(ctx: LiteContext): string {
  const ex = ctx.exerciseName ? `, working on ${ctx.exerciseName}` : ''
  return pick([
    `Got it${ex}.`,
    'Noted.',
    'OK.',
  ])
}

// Session end
export function getSessionEndResponse(ctx: LiteContext): string {
  const readinessCue = ctx.readiness === 'tired' ? ' especially given how you felt coming in.' : '.'
  return pick([
    `Good work today${readinessCue} Session done.`,
    `That\'s a session${readinessCue} Well done.`,
    `Done. Good work${readinessCue}`,
  ])
}