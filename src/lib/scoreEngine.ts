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

export async function awardSessionScore(
  userId: string,
  sessionId: string,
  extras: {
    progressionUnlocked: boolean
    fullBookends: boolean
  }
) {
  let points = SCORES.SESSION
  if (extras.progressionUnlocked) points += SCORES.PROGRESSION
  if (extras.fullBookends) points += SCORES.FULL_BOOKENDS

  const { data: current } = await supabase
    .from('user_score')
    .select('total_score, weekly_score, total_sessions, current_streak, longest_streak, total_reps')
    .eq('user_id', userId)
    .single()

  const newStreak = (current?.current_streak ?? 0) + 1
  const weeklyBonus = newStreak % 7 === 0 ? SCORES.WEEKLY_STREAK : 0
  const totalPoints = points + weeklyBonus

  await supabase.from('user_score').upsert({
    user_id: userId,
    total_score: Math.max(0, (current?.total_score ?? 0) + totalPoints),
    weekly_score: (current?.weekly_score ?? 0) + totalPoints,
    total_sessions: (current?.total_sessions ?? 0) + 1,
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, current?.longest_streak ?? 0),
    total_reps: current?.total_reps ?? 0,
    updated_at: new Date().toISOString(),
  })

  await supabase
    .from('workout_sessions')
    .update({ score_awarded: totalPoints })
    .eq('id', sessionId)

  return totalPoints
}
