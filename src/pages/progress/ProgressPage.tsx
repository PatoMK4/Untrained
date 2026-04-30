import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wordmark } from '@/components/ui/Wordmark'
import { useScore, useSessionHistory } from '@/hooks/useScore'
import { useProgression } from '@/hooks/useWorkout'
import { useUserProfile } from '@/hooks/useWorkout'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { MovementPattern } from '@/types/app.types'

const PATTERN_LABELS: Record<MovementPattern, string> = {
  push: 'PUSH', pull: 'PULL', squat: 'SQUAT', hinge: 'HINGE', core: 'CORE',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  full_body: 'Full Body', push: 'Push', pull: 'Pull',
  legs: 'Legs', active_recovery: 'Recovery', rest: 'Rest',
}

export default function ProgressPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: score, isLoading: scoreLoading } = useScore()
  const { data: history, isLoading: historyLoading } = useSessionHistory()
  const { data: progression } = useProgression()
  const { data: profile } = useUserProfile()
  const [activePattern, setActivePattern] = useState<MovementPattern>('push')

  // Benchmarks for empty state
  const hasSessions = (score?.total_sessions ?? 0) > 0

  // Weekly activity — last 7 days
  const { data: weekActivity } = useQuery({
    queryKey: ['week_activity', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('date, session_type, status, total_sets, total_reps, score_awarded')
        .eq('user_id', user!.id)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false })
      return data ?? []
    },
    enabled: !!user,
  })

  const isLoading = scoreLoading || historyLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <Wordmark />
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-surface rounded-card animate-pulse" />
        ))}
      </div>
    )
  }

  // Score values — handle both old (total_score) and new (total_exp) column names
  const totalScore = (score as Record<string, number> | null | undefined)?.total_exp
    ?? (score as Record<string, number> | null | undefined)?.total_score
    ?? 0
  const weeklyScore = (score as Record<string, number> | null | undefined)?.weekly_exp
    ?? (score as Record<string, number> | null | undefined)?.weekly_score
    ?? 0
  const streak = score?.current_streak ?? 0
  const longestStreak = score?.longest_streak ?? 0
  const totalSessions = score?.total_sessions ?? 0
  const totalReps = (score as Record<string, number> | null | undefined)?.total_reps ?? 0

  // Empty state — no sessions yet
  if (!hasSessions) {
    return (
      <div className="flex flex-col gap-6 pt-6">
        <Wordmark />
        <h1 className="text-3xl font-black text-text-primary">YOUR STARTING POINT.</h1>
        <p className="text-text-secondary text-sm">
          Complete your first session to unlock your full Progress dashboard.
        </p>

        {/* Benchmark cards */}
        <div className="flex flex-col gap-3">
          {profile?.pushup_benchmark !== undefined && (
            <div className="bg-surface rounded-card p-4 border-l-4 border-accent">
              <p className="text-text-disabled text-xs tracking-widest mb-1">PUSH — DAY ONE</p>
              <p className="text-text-primary font-bold">
                {profile.pushup_benchmark} push-ups
              </p>
              <p className="text-text-secondary text-sm">
                First milestone: {profile.pushup_benchmark + 5} push-ups
              </p>
            </div>
          )}
          {profile?.pullup_benchmark !== undefined && (
            <div className="bg-surface rounded-card p-4 border-l-4 border-accent">
              <p className="text-text-disabled text-xs tracking-widest mb-1">PULL — DAY ONE</p>
              <p className="text-text-primary font-bold">
                {profile.pullup_benchmark === 0
                  ? 'Working toward first pull-up'
                  : `${profile.pullup_benchmark} pull-ups`}
              </p>
              <p className="text-text-secondary text-sm">
                {profile.pullup_benchmark === 0
                  ? 'First milestone: 1 assisted pull-up'
                  : `First milestone: ${profile.pullup_benchmark + 2} pull-ups`}
              </p>
            </div>
          )}
          {profile?.squat_benchmark !== undefined && (
            <div className="bg-surface rounded-card p-4 border-l-4 border-accent">
              <p className="text-text-disabled text-xs tracking-widest mb-1">SQUAT — DAY ONE</p>
              <p className="text-text-primary font-bold">
                {profile.squat_benchmark} {profile.squat_type === 'hold' ? 'sec hold' : 'jump squats'}
              </p>
              <p className="text-text-secondary text-sm">
                First milestone: {profile.squat_benchmark + 10} {profile.squat_type === 'hold' ? 'sec' : 'reps'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/')}
          className="h-12 bg-accent text-navbar font-black rounded-pill text-sm tracking-widest"
        >
          GO TO TODAY
        </button>
      </div>
    )
  }

  const patterns: MovementPattern[] = ['push', 'pull', 'squat', 'hinge', 'core']
  const currentLevel = progression?.[activePattern] ?? 1

  return (
    <div className="flex flex-col gap-6 pt-6">
      <Wordmark />

      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-card p-5 border-l-4 border-accent"
      >
        <p className="text-text-disabled text-xs tracking-widest mb-1">TOTAL SCORE</p>
        <p className="text-6xl font-black text-text-primary leading-none">{totalScore}</p>
        {weeklyScore > 0 && (
          <p className="text-accent text-sm mt-2 font-bold">+{weeklyScore} this week</p>
        )}
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-card p-4 flex flex-col gap-1">
          <p className="text-text-disabled text-xs tracking-widest">STREAK</p>
          <p className="text-text-primary font-black text-2xl">{streak}</p>
          <p className="text-text-disabled text-xs">days</p>
        </div>
        <div className="bg-surface rounded-card p-4 flex flex-col gap-1">
          <p className="text-text-disabled text-xs tracking-widest">SESSIONS</p>
          <p className="text-text-primary font-black text-2xl">{totalSessions}</p>
          <p className="text-text-disabled text-xs">total</p>
        </div>
        <div className="bg-surface rounded-card p-4 flex flex-col gap-1">
          <p className="text-text-disabled text-xs tracking-widest">BEST STREAK</p>
          <p className="text-text-primary font-black text-2xl">{longestStreak}</p>
          <p className="text-text-disabled text-xs">days</p>
        </div>
      </div>

      {totalReps > 0 && (
        <div className="bg-surface rounded-card p-4">
          <p className="text-text-disabled text-xs tracking-widest mb-1">TOTAL REPS LOGGED</p>
          <p className="text-text-primary font-black text-3xl">{totalReps.toLocaleString()}</p>
        </div>
      )}

      {/* This week */}
      {weekActivity && weekActivity.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-text-disabled text-xs tracking-widest">THIS WEEK</p>
          {weekActivity.map((s, i) => (
            <div key={i} className="bg-surface rounded-card p-4 flex items-center justify-between">
              <div>
                <p className="text-text-primary font-bold text-sm">
                  {SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}
                </p>
                <p className="text-text-disabled text-xs">
                  {new Date(s.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                {s.total_sets > 0 && (
                  <p className="text-text-secondary text-sm">{s.total_sets} sets · {s.total_reps} reps</p>
                )}
                {s.score_awarded > 0 && (
                  <p className="text-accent text-xs font-bold">+{s.score_awarded} pts</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progression roadmap */}
      <div className="flex flex-col gap-3">
        <p className="text-text-disabled text-xs tracking-widest">YOUR ROADMAP</p>

        {/* Pattern tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {patterns.map(p => (
            <button
              key={p}
              onClick={() => setActivePattern(p)}
              className={`flex-shrink-0 h-9 px-4 rounded-pill text-xs font-bold tracking-widest transition-all ${
                activePattern === p
                  ? 'bg-accent text-navbar'
                  : 'bg-surface text-text-secondary'
              }`}
            >
              {PATTERN_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Level indicator */}
        <div className="bg-surface rounded-card p-4">
          <p className="text-text-disabled text-xs tracking-widest mb-2">CURRENT LEVEL</p>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[1,2,3,4].map(lvl => (
                <div
                  key={lvl}
                  className={`h-3 rounded-full transition-all ${
                    lvl < currentLevel
                      ? 'w-8 bg-accent'
                      : lvl === currentLevel
                      ? 'w-8 bg-accent animate-pulse'
                      : 'w-8 bg-surface-raised'
                  }`}
                />
              ))}
            </div>
            <p className="text-text-primary font-bold">
              {currentLevel === 1 ? 'Beginner'
                : currentLevel === 2 ? 'Novice'
                : currentLevel === 3 ? 'Intermediate'
                : 'Advanced'}
            </p>
          </div>
          <p className="text-text-secondary text-sm mt-3">
            {currentLevel < 4
              ? `Complete sessions consistently to advance to level ${currentLevel + 1}.`
              : 'You have reached the highest level for this pattern.'}
          </p>
        </div>
      </div>

      {/* Session history */}
      {history && history.length > 0 && (
        <div className="flex flex-col gap-3 pb-6">
          <p className="text-text-disabled text-xs tracking-widest">RECENT SESSIONS</p>
          {history.slice(0, 10).map((s, i) => (
            <div key={i} className="bg-surface rounded-card p-4 flex items-center justify-between">
              <div>
                <p className="text-text-primary font-bold text-sm">
                  {SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}
                </p>
                <p className="text-text-disabled text-xs">
                  {new Date(s.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary text-sm">
                  {s.total_sets} sets
                </p>
                {s.score_awarded > 0 && (
                  <p className="text-accent text-xs font-bold">+{s.score_awarded}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
