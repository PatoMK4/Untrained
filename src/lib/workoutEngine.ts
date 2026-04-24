import type { Exercise, SessionType, MovementPattern } from '@/types/app.types'

// ── Types ────────────────────────────────────────────────────────────────────

export type TimeSlot = 30 | 45 | 60 | 'no_rush'
export type SplitPreference = 'full_body' | 'ppl' | 'upper_lower' | 'bro_split'

export interface SessionConfig {
  warmupCount: number
  cooldownCount: number
  setsPerExercise: number
  baseRestSeconds: number
  mainCount: number
  totalMinutes: number | null
}

// ── Schedule cycles ──────────────────────────────────────────────────────────
// Each array is one full rotation. Rest days are explicit so the math is exact.
// Science: schedule built from training start date, NOT day of week.

const CYCLES: Record<SplitPreference, Record<number, SessionType[]>> = {
  full_body: {
    2: ['full_body', 'rest', 'full_body', 'rest'],
    3: ['full_body', 'rest', 'full_body', 'rest', 'full_body', 'rest'],
    4: ['full_body', 'full_body', 'rest', 'full_body', 'full_body', 'rest'],
    5: ['full_body', 'full_body', 'rest', 'full_body', 'full_body', 'full_body', 'rest'],
  },
  ppl: {
    3: ['push', 'rest', 'pull', 'rest', 'legs', 'rest'],
    6: ['push', 'pull', 'legs', 'rest', 'push', 'pull', 'legs', 'rest'],
    5: ['push', 'pull', 'legs', 'push', 'pull', 'rest', 'legs', 'rest'],
    4: ['push', 'pull', 'rest', 'legs', 'full_body', 'rest'],
  },
  upper_lower: {
    4: ['push', 'legs', 'rest', 'pull', 'full_body', 'rest'],
  },
  bro_split: {
    5: ['push', 'pull', 'legs', 'full_body', 'push', 'rest', 'rest'],
    6: ['push', 'pull', 'legs', 'full_body', 'push', 'pull', 'rest'],
  },
}

function getCycle(split: SplitPreference, trainingDays: number): SessionType[] {
  const available = CYCLES[split] ?? CYCLES.full_body
  if (available[trainingDays]) return available[trainingDays]
  const keys = Object.keys(available).map(Number)
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - trainingDays) < Math.abs(prev - trainingDays) ? curr : prev
  )
  return available[closest] ?? CYCLES.full_body[3]
}

export function getSessionType(
  trainingDays: number,
  splitPreference: SplitPreference = 'full_body',
  trainingStartDate?: string,
  completedSessionCount: number = 0
): SessionType {
  const cycle = getCycle(splitPreference, trainingDays)

  // If the user has never completed a session, always give them a workout.
  // This prevents the frustrating "rest day on day 1" problem.
  if (completedSessionCount === 0) {
    // Return first non-rest session type from the cycle
    const firstWorkout = cycle.find((s) => s !== 'rest' && s !== 'active_recovery')
    return firstWorkout ?? 'full_body'
  }

  if (!trainingStartDate) {
    // Fallback: use day of week if no start date
    const day = new Date().getDay()
    return cycle[day % cycle.length]
  }

  // Calculate days elapsed since training start
  const start = new Date(trainingStartDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysElapsed = Math.floor((today.getTime() - start.getTime()) / msPerDay)
  const dayIndex = ((daysElapsed % cycle.length) + cycle.length) % cycle.length

  return cycle[dayIndex]
}

// ── Session config ────────────────────────────────────────────────────────────

const SET_WORK_SECONDS = 45
const TRANSITION_SECONDS = 30
const BOOKEND_SECONDS = 60

export const BASE_REST: Record<'lower' | 'upper' | 'core', number> = {
  lower: 90,
  upper: 75,
  core: 60,
}

function timePerMainExercise(sets: number, restSeconds: number): number {
  return sets * SET_WORK_SECONDS + (sets - 1) * restSeconds + TRANSITION_SECONDS
}

export function getSessionConfig(time: TimeSlot): SessionConfig {
  if (time === 'no_rush') {
    return {
      warmupCount: 5,
      cooldownCount: 5,
      setsPerExercise: 4,
      baseRestSeconds: 90,
      mainCount: 6,
      totalMinutes: null,
    }
  }

  const setsMap: Record<number, number> = { 30: 2, 45: 3, 60: 4 }
  const baseRestMap: Record<number, number> = { 30: 60, 45: 75, 60: 90 }
  const sets = setsMap[time] ?? 3
  const baseRest = baseRestMap[time] ?? 75

  const warmupCount = time === 30 ? 2 : time === 45 ? 3 : 4
  const cooldownCount = time === 30 ? 2 : time === 45 ? 3 : 4
  const bookendSeconds = (warmupCount + cooldownCount) * BOOKEND_SECONDS
  const availableForMain = (time as number) * 60 - bookendSeconds
  const perExercise = timePerMainExercise(sets, baseRest)
  const rawMain = Math.floor(availableForMain / perExercise)
  const maxMain: Record<number, number> = { 30: 4, 45: 5, 60: 7 }
  const mainCount = Math.min(Math.max(rawMain, 3), maxMain[time] ?? 5)

  return {
    warmupCount,
    cooldownCount,
    setsPerExercise: sets,
    baseRestSeconds: baseRest,
    mainCount,
    totalMinutes: time,
  }
}

// ── Dynamic rest ─────────────────────────────────────────────────────────────

export function calculateRestSeconds(
  muscleGroup: MovementPattern,
  lastEffort: 'easy' | 'medium' | 'hard' | null,
  consecutiveHardSets: number,
  timeSlot: TimeSlot
): number {
  const groupType: 'lower' | 'upper' | 'core' =
    muscleGroup === 'squat' || muscleGroup === 'hinge' ? 'lower'
    : muscleGroup === 'core' ? 'core'
    : 'upper'

  let rest = BASE_REST[groupType]

  if (lastEffort === 'easy') rest -= 15
  else if (lastEffort === 'hard') {
    if (consecutiveHardSets >= 3) rest += 60
    else if (consecutiveHardSets >= 2) rest += 45
    else rest += 30
  }

  if (timeSlot === 30) rest = Math.min(rest, 60)
  return Math.max(30, rest)
}

// ── Session patterns ──────────────────────────────────────────────────────────

const SESSION_PATTERNS: Record<string, MovementPattern[]> = {
  full_body:       ['squat', 'hinge', 'push', 'pull', 'core', 'squat', 'pull'],
  push:            ['push', 'push', 'push', 'push', 'core', 'push', 'core'],
  pull:            ['pull', 'pull', 'pull', 'pull', 'core', 'pull', 'core'],
  legs:            ['squat', 'hinge', 'squat', 'hinge', 'squat', 'hinge', 'core'],
  active_recovery: ['core', 'core', 'core', 'core', 'core', 'core', 'core'],
  rest:            [],
}

// ── Workout builder ───────────────────────────────────────────────────────────

export function buildWorkout(
  sessionType: SessionType,
  timeSlot: TimeSlot,
  progressionLevels: Record<MovementPattern, number>,
  equipment: string[],
  allExercises: Exercise[]
): { warmup: Exercise[]; main: Exercise[]; cooldown: Exercise[]; config: SessionConfig } {
  const config = getSessionConfig(timeSlot)
  const patternSlots = (SESSION_PATTERNS[sessionType] ?? []).slice(0, config.mainCount)
  const expandedEquipment = expandEquipment(equipment)

  const usedIds = new Set<string>()
  const main: Exercise[] = []

  for (const pattern of patternSlots) {
    const level = progressionLevels[pattern] ?? 1
    const exercise = pickExercise(pattern, level, expandedEquipment, allExercises, usedIds)
    if (exercise) {
      main.push(exercise)
      usedIds.add(exercise.id)
    }
  }

  const musclesWorked = [...new Set(main.map((e) => e.muscle_group))]
  const warmup = pickBookend(true, musclesWorked, config.warmupCount, allExercises)
  const cooldown = pickBookend(false, musclesWorked, config.cooldownCount, allExercises)

  return { warmup, main, cooldown, config }
}

// ── Recovery session builder ──────────────────────────────────────────────────

export function buildRecoverySession(
  mode: 'active_recovery' | 'skill_practice',
  weakestPattern: MovementPattern,
  progressionLevels: Record<MovementPattern, number>,
  allExercises: Exercise[]
): { exercises: Exercise[]; setsPerExercise: number } {
  const main: Exercise[] = []

  if (mode === 'skill_practice') {
    const level = progressionLevels[weakestPattern] ?? 1
    const match = allExercises.find(
      (e) =>
        !e.is_warmup &&
        !e.is_cooldown &&
        e.muscle_group === weakestPattern &&
        e.progression_level === level
    )
    if (match) main.push(match)
  }

  // Fill with core + warmup exercises (low impact)
  const filler = allExercises
    .filter(
      (e) =>
        (e.is_warmup || e.muscle_group === 'core') &&
        !e.is_cooldown &&
        !main.find((m) => m.id === e.id)
    )
    .slice(0, 4)

  main.push(...filler)

  // Always end with 2 cooldown stretches
  const cooldown = allExercises.filter((e) => e.is_cooldown).slice(0, 2)

  return { exercises: [...main, ...cooldown], setsPerExercise: 2 }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function expandEquipment(equipment: string[]): string[] {
  if (equipment.includes('gym')) return ['none', 'pullup_bar', 'rings', 'gym']
  return equipment
}

function canUseEquipment(required: string, available: string[]): boolean {
  if (required === 'none') return true
  if (required === 'pullup_bar') return available.includes('pullup_bar') || available.includes('gym')
  if (required === 'rings') return available.includes('rings') || available.includes('gym')
  if (required === 'gym') return available.includes('gym')
  return false
}

function pickExercise(
  pattern: MovementPattern,
  level: number,
  equipment: string[],
  allExercises: Exercise[],
  usedIds: Set<string>
): Exercise | null {
  const candidates = allExercises.filter(
    (e) => !e.is_warmup && !e.is_cooldown && e.muscle_group === pattern && !usedIds.has(e.id)
  )
  if (candidates.length === 0) return null
  const withEquip = candidates.filter((e) => canUseEquipment(e.equipment_required, equipment))
  const pool = withEquip.length > 0 ? withEquip : candidates
  const exact = pool.find((e) => e.progression_level === level)
  if (exact) return exact
  return [...pool].sort(
    (a, b) => Math.abs(a.progression_level - level) - Math.abs(b.progression_level - level)
  )[0] ?? null
}

function pickBookend(
  isWarmup: boolean,
  musclesWorked: string[],
  count: number,
  allExercises: Exercise[]
): Exercise[] {
  const targeted = allExercises.filter(
    (e) =>
      (isWarmup ? e.is_warmup : e.is_cooldown) &&
      e.applicable_for.some((m) => musclesWorked.includes(m))
  )
  const generic = allExercises.filter(
    (e) => (isWarmup ? e.is_warmup : e.is_cooldown) && !targeted.find((t) => t.id === e.id)
  )
  return [...targeted, ...generic].slice(0, count)
}

export function getSetsForTime(time: TimeSlot): number {
  return getSessionConfig(time).setsPerExercise
}

export function estimateCalories(totalSets: number, avgReps: number): number {
  return Math.round(totalSets * avgReps * 0.5)
}

export function sessionTypeLabel(type: SessionType): string {
  const labels: Record<SessionType, string> = {
    push: 'PUSH DAY', pull: 'PULL DAY', legs: 'LEG DAY',
    full_body: 'FULL BODY', active_recovery: 'ACTIVE RECOVERY', rest: 'REST DAY',
  }
  return labels[type] ?? 'WORKOUT'
}

export function timeSlotLabel(slot: TimeSlot): string {
  if (slot === 'no_rush') return 'NO RUSH'
  if (slot === 60) return '60 MIN+'
  return `${slot} MIN`
}

export function splitLabel(split: SplitPreference): string {
  const labels: Record<SplitPreference, string> = {
    full_body: 'Full Body', ppl: 'Push / Pull / Legs',
    upper_lower: 'Upper / Lower', bro_split: 'Muscle Group Split',
  }
  return labels[split]
}

export function estimateSessionMinutes(config: SessionConfig): number {
  if (config.totalMinutes === null) return 75
  const bookends = (config.warmupCount + config.cooldownCount) * BOOKEND_SECONDS
  const mainTime = config.mainCount * timePerMainExercise(config.setsPerExercise, config.baseRestSeconds)
  return Math.round((bookends + mainTime) / 60)
}