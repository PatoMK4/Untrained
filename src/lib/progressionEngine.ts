import type { Effort } from '@/types/app.types'
import { supabase } from '@/lib/supabase'

interface ProgressionCheck {
  sessionsAtLevel: number
  recentEfforts: Effort[]
  recentReps: number[]
  targetRepsMin: number
}

export function shouldProgress(input: ProgressionCheck): boolean {
  const { sessionsAtLevel, recentEfforts, recentReps, targetRepsMin } = input
  if (sessionsAtLevel < 2) return false
  if (recentEfforts.length < 4) return false
  const last4Efforts = recentEfforts.slice(-4)
  const last4Reps = recentReps.slice(-4)
  const allGoodEffort = last4Efforts.every((e) => e === 'easy' || e === 'medium')
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
  const first3avg = recentReps.slice(0, 3).reduce((a, b) => a + b, 0) / 3
  const last3avg = recentReps.slice(-3).reduce((a, b) => a + b, 0) / 3
  return last3avg <= first3avg
}

export async function runProgressionCheck(
  userId: string,
  sessionId: string
): Promise<boolean> {
  // Get all non-skipped logs for this session with exercise data
  const { data: logs, error: logsErr } = await supabase
    .from('exercise_logs')
    .select('effort, reps, exercise_id, exercises(muscle_group, target_reps_min)')
    .eq('session_id', sessionId)
    .eq('skipped', false)

  if (logsErr || !logs || logs.length === 0) return false

  // Get current user progressions for all patterns
  const { data: progressions, error: progErr } = await supabase
    .from('user_progression')
    .select('*')
    .eq('user_id', userId)

  if (progErr || !progressions) return false

  let anyProgressed = false

  // Group logs by movement pattern
  const byPattern: Record<string, {
    efforts: Effort[]
    reps: number[]
    targetRepsMin: number
  }> = {}

  for (const log of logs) {
    const ex = log.exercises as { muscle_group: string; target_reps_min: number | null } | null
    if (!ex) continue
    const pattern = ex.muscle_group
    if (!['push', 'pull', 'squat', 'hinge', 'core'].includes(pattern)) continue
    if (!byPattern[pattern]) {
      byPattern[pattern] = { efforts: [], reps: [], targetRepsMin: ex.target_reps_min ?? 8 }
    }
    if (log.effort) byPattern[pattern].efforts.push(log.effort as Effort)
    if (log.reps != null) byPattern[pattern].reps.push(log.reps as number)
  }

  for (const [pattern, data] of Object.entries(byPattern)) {
    const prog = progressions.find((p) => p.movement_pattern === pattern)
    if (!prog) continue

    const sessionsAtLevel = (prog.sessions_at_level ?? 0) + 1
    const currentLevel = (prog.current_level ?? 1) as number

    const progressed = shouldProgress({
      sessionsAtLevel,
      recentEfforts: data.efforts,
      recentReps: data.reps,
      targetRepsMin: data.targetRepsMin,
    })

    const regressed = shouldRegress({
      sessionsAtLevel,
      recentEfforts: data.efforts,
      recentReps: data.reps,
    })

    let newLevel = currentLevel
    let newSessionsAtLevel = sessionsAtLevel

    if (progressed && currentLevel < 4) {
      newLevel = currentLevel + 1
      newSessionsAtLevel = 0
      anyProgressed = true
    } else if (regressed && currentLevel > 1) {
      newLevel = currentLevel - 1
      newSessionsAtLevel = 0
    }

    const allEasy = data.efforts.every((e) => e === 'easy')
    const allHard = data.efforts.every((e) => e === 'hard')

    await supabase
      .from('user_progression')
      .update({
        current_level: newLevel,
        sessions_at_level: newSessionsAtLevel,
        consecutive_easy: allEasy ? (prog.consecutive_easy ?? 0) + 1 : 0,
        consecutive_hard: allHard ? (prog.consecutive_hard ?? 0) + 1 : 0,
        last_updated: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('movement_pattern', pattern)
  }

  return anyProgressed
}