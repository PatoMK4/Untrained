import type { Effort } from '@/types/app.types'

interface ProgressionCheck {
  sessionsAtLevel: number
  recentEfforts: Effort[] // last 6 individual set efforts
  recentReps: number[] // last 6 set rep counts
  targetRepsMin: number
}

export function shouldProgress(input: ProgressionCheck): boolean {
  const { sessionsAtLevel, recentEfforts, recentReps, targetRepsMin } = input
  if (sessionsAtLevel < 3) return false
  if (recentEfforts.length < 4) return false

  const last4Efforts = recentEfforts.slice(-4)
  const last4Reps = recentReps.slice(-4)

  // All last 4 sets must be easy or medium
  const allGoodEffort = last4Efforts.every((e) => e === 'easy' || e === 'medium')
  // Last 4 sets must all meet target reps
  const repsMetTarget = last4Reps.every((r) => r >= targetRepsMin)

  return allGoodEffort && repsMetTarget
}

export function shouldRegress(
  input: Omit<ProgressionCheck, 'targetRepsMin'>
): boolean {
  const { recentEfforts, recentReps } = input
  if (recentEfforts.length < 6) return false

  const last6 = recentEfforts.slice(-6)
  const allHard = last6.every((e) => e === 'hard')
  if (!allHard) return false

  // Check reps are not improving
  const first3avg = recentReps.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const last3avg = recentReps.slice(-3).reduce((a, b) => a + b, 0) / 3
  return last3avg <= first3avg
}
