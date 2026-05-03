import { supabase } from '@/lib/supabase'

export const SCORES = {
  SESSION: 10,
  PROGRESSION: 25,
  PREDICTION_EARLY: 50,
  WEEKLY_STREAK: 15,
  FULL_BOOKENDS: 5,
  MISSED: -5,
  PLATEAU: -10,
} as const

const LEVEL_TITLES = [
  'Untrained', 'Beginner', 'Novice', 'Intermediate',
  'Trained', 'Advanced', 'Elite', 'Champion',
]

function calcLevel(exp: number): { level: number; title: string } {
  const level = Math.min(Math.floor(Math.sqrt(exp / 10)) + 1, LEVEL_TITLES.length)
  return { level, title: LEVEL_TITLES[level - 1] ?? 'Champion' }
}

// Guarantee a user_score row exists — call before any read
export async function ensureUserScoreRow(userId: string): Promise<void> {
  const { data } = await supabase
    .from('user_score')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) {
    await supabase.from('user_score').insert({
      user_id: userId,
      total_exp: 0,
      weekly_exp: 0,
      current_streak: 0,
      longest_streak: 0,
      total_sessions: 0,
      total_reps: 0,
      user_level: 1,
      user_level_title: 'Untrained',
    })
  }
}

export async function awardSessionScore(
  userId: string,
  sessionId: string,
  extras: { progressionUnlocked: boolean; fullBookends: boolean }
): Promise<number> {
  await ensureUserScoreRow(userId)

  let points = SCORES.SESSION
  if (extras.progressionUnlocked) points += SCORES.PROGRESSION
  if (extras.fullBookends) points += SCORES.FULL_BOOKENDS

  const { data: current } = await supabase
    .from('user_score')
    .select('*')
    .eq('user_id', userId)
    .single()

  const row = (current ?? {}) as Record<string, unknown>

  const currentExp = (row.total_exp ?? row.total_score ?? 0) as number
  const currentWeeklyExp = (row.weekly_exp ?? row.weekly_score ?? 0) as number
  const currentSessions = (row.total_sessions ?? 0) as number
  const currentStreak = (row.current_streak ?? 0) as number
  const currentLongest = (row.longest_streak ?? 0) as number
  const currentReps = (row.total_reps ?? 0) as number

  const { data: sessionLogs } = await supabase
    .from('exercise_logs')
    .select('reps')
    .eq('session_id', sessionId)
  const sessionReps = (sessionLogs ?? []).reduce(
    (sum, l) => sum + (((l as Record<string, unknown>).reps as number) ?? 0), 0
  )

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const { data: lastSession } = await supabase
    .from('workout_sessions')
    .select('date')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .neq('id', sessionId)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const lastDate = lastSession?.date as string | undefined
  const streakContinues = !lastDate || lastDate === today || lastDate === yesterday
  const newStreak = streakContinues ? currentStreak + 1 : 1
  const weeklyBonus = newStreak % 7 === 0 ? SCORES.WEEKLY_STREAK : 0
  const totalPoints = points + weeklyBonus

  const newExp = Math.max(0, currentExp + totalPoints)
  const { level, title } = calcLevel(newExp)

  const now = new Date()
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const storedWeekStart = row.week_start as string | undefined
  const newWeeklyExp = storedWeekStart === weekStartStr ? currentWeeklyExp + totalPoints : totalPoints

  const hasNewColumns = 'total_exp' in row
  const scoreUpsert: Record<string, unknown> = {
    user_id: userId,
    total_sessions: currentSessions + 1,
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, currentLongest),
    total_reps: currentReps + sessionReps,
    user_level: level,
    user_level_title: title,
    week_start: weekStartStr,
    updated_at: new Date().toISOString(),
  }
  if (hasNewColumns) {
    scoreUpsert.total_exp = newExp
    scoreUpsert.weekly_exp = newWeeklyExp
  } else {
    scoreUpsert.total_score = newExp
    scoreUpsert.weekly_score = newWeeklyExp
  }

  const { error: upsertErr } = await supabase.from('user_score').upsert(scoreUpsert)
  if (upsertErr) console.error('Score upsert error:', upsertErr)

  await supabase.from('workout_sessions').update({
    score_awarded: totalPoints,
    completed_at: new Date().toISOString(),
  }).eq('id', sessionId)

  try {
    await supabase.from('exp_transactions').insert({
      user_id: userId, session_id: sessionId, amount: totalPoints,
      reason: `Session${extras.fullBookends ? ' + bookends' : ''}${extras.progressionUnlocked ? ' + progression' : ''}`,
      is_achievement_unlock: false,
    })
  } catch { /* non-fatal */ }

  return totalPoints
}