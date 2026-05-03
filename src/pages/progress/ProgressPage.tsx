import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wordmark } from '@/components/ui/Wordmark'
import { useScore, useSessionHistory } from '@/hooks/useScore'
import { useProgression, useUserProfile } from '@/hooks/useWorkout'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { MovementPattern } from '@/types/app.types'

const PATTERN_LABELS: Record<MovementPattern, string> = {
  push: 'PUSH', pull: 'PULL', squat: 'SQUAT', hinge: 'HINGE', core: 'CORE',
}
const LEVEL_LABELS = ['', 'Beginner', 'Novice', 'Intermediate', 'Advanced']
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

  const hasSessions = (score?.total_sessions ?? 0) > 0

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

  const { data: lastWeekSummary } = useQuery({
    queryKey: ['last_week_summary', user?.id],
    queryFn: async () => {
      const now = new Date()
      const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
      const thisMonday = new Date(now)
      thisMonday.setDate(now.getDate() - daysFromMonday)
      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(thisMonday.getDate() - 7)
      const { data } = await supabase
        .from('workout_sessions')
        .select('date, total_sets, total_reps, score_awarded, session_type')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .gte('date', lastMonday.toISOString().split('T')[0])
        .lt('date', thisMonday.toISOString().split('T')[0])
      return data ?? []
    },
    enabled: !!user,
  })

  const isMonday = new Date().getDay() === 1
  const isLoading = scoreLoading || historyLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <Wordmark />
        {[1,2,3].map(i => <div key={i} className="h-20 bg-surface rounded-card animate-pulse" />)}
      </div>
    )
  }

  const scoreRow = (score ?? {}) as Record<string, unknown>
  const totalScore = (scoreRow.total_exp ?? scoreRow.total_score ?? 0) as number
  const weeklyScore = (scoreRow.weekly_exp ?? scoreRow.weekly_score ?? 0) as number
  const streak = (scoreRow.current_streak ?? 0) as number
  const longestStreak = (scoreRow.longest_streak ?? 0) as number
  const totalSessions = (scoreRow.total_sessions ?? 0) as number
  const totalReps = (scoreRow.total_reps ?? 0) as number
  const userLevel = (scoreRow.user_level ?? 1) as number
  const userLevelTitle = (scoreRow.user_level_title ?? 'Untrained') as string

  if (!hasSessions) {
    return (
      <div className="flex flex-col gap-6 pt-6">
        <Wordmark />
        <h1 className="text-3xl font-black text-text-primary">YOUR STARTING POINT.</h1>
        <p className="text-text-secondary text-sm">Complete your first session to unlock your full Progress dashboard.</p>
        <div className="flex flex-col gap-3">
          {profile?.pushup_benchmark !== undefined && (
            <div className="bg-surface rounded-card p-4 border-l-4 border-accent">
              <p className="text-text-disabled text-xs tracking-widest mb-1">PUSH — DAY ONE</p>
              <p className="text-text-primary font-bold">{profile.pushup_benchmark} push-ups</p>
              <p className="text-text-secondary text-sm">First milestone: {profile.pushup_benchmark + 5} push-ups</p>
            </div>
          )}
          {profile?.pullup_benchmark !== undefined && (
            <div className="bg-surface rounded-card p-4 border-l-4 border-accent">
              <p className="text-text-disabled text-xs tracking-widest mb-1">PULL — DAY ONE</p>
              <p className="text-text-primary font-bold">
                {profile.pullup_benchmark === 0 ? 'Working toward first pull-up' : `${profile.pullup_benchmark} pull-ups`}
              </p>
            </div>
          )}
        </div>
        <button onClick={() => navigate('/')} className="h-12 bg-accent text-navbar font-black rounded-pill text-sm tracking-widest">
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

      {/* Weekly summary — Mondays only */}
      {isMonday && lastWeekSummary && lastWeekSummary.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card p-5 border-l-4 border-accent"
        >
          <p className="text-accent text-xs font-bold tracking-widest mb-2">LAST WEEK</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-text-disabled text-xs">SESSIONS</p>
              <p className="text-text-primary font-black text-2xl">{lastWeekSummary.length}</p>
            </div>
            <div>
              <p className="text-text-disabled text-xs">TOTAL REPS</p>
              <p className="text-text-primary font-black text-2xl">
                {lastWeekSummary.reduce((s, r) => s + (r.total_reps ?? 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-text-disabled text-xs">SCORE</p>
              <p className="text-accent font-black text-2xl">
                +{lastWeekSummary.reduce((s, r) => s + (r.score_awarded ?? 0), 0)}
              </p>
            </div>
          </div>
          <p className="text-text-secondary text-sm mt-3">
            {lastWeekSummary.length >= 4
              ? 'Strong week. Keep the momentum.'
              : lastWeekSummary.length >= 2
              ? 'Good start. Aim for one more session this week.'
              : 'Every session counts. Build the habit.'}
          </p>
        </motion.div>
      )}

      {/* Score + level */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-card p-5"
      >
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-text-disabled text-xs tracking-widest mb-1">TOTAL SCORE</p>
            <p className="text-6xl font-black text-text-primary leading-none">{totalScore}</p>
          </div>
          <div className="text-right">
            <p className="text-accent font-black text-lg">{userLevelTitle.toUpperCase()}</p>
            <p className="text-text-disabled text-xs">Level {userLevel}</p>
          </div>
        </div>
        {weeklyScore > 0 && <p className="text-accent text-sm mt-2 font-bold">+{weeklyScore} this week</p>}
      </motion.div>

      {/* Stats grid */}
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
                <p className="text-text-primary font-bold text-sm">{SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}</p>
                <p className="text-text-disabled text-xs">
                  {new Date(s.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                {s.total_sets > 0 && <p className="text-text-secondary text-sm">{s.total_sets} sets · {s.total_reps} reps</p>}
                {s.score_awarded > 0 && <p className="text-accent text-xs font-bold">+{s.score_awarded} pts</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roadmap */}
      <div className="flex flex-col gap-3">
        <p className="text-text-disabled text-xs tracking-widest">YOUR ROADMAP</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {patterns.map(p => (
            <button key={p} onClick={() => setActivePattern(p)}
              className={`flex-shrink-0 h-9 px-4 rounded-pill text-xs font-bold tracking-widest transition-all ${
                activePattern === p ? 'bg-accent text-navbar' : 'bg-surface text-text-secondary'
              }`}
            >
              {PATTERN_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="bg-surface rounded-card p-4">
          <p className="text-text-disabled text-xs tracking-widest mb-3">CURRENT LEVEL</p>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-2">
              {[1,2,3,4].map(lvl => (
                <div key={lvl} className={`h-3 w-8 rounded-full transition-all ${
                  lvl < currentLevel ? 'bg-accent'
                  : lvl === currentLevel ? 'bg-accent opacity-60'
                  : 'bg-surface-raised'
                }`} />
              ))}
            </div>
            <p className="text-text-primary font-bold">{LEVEL_LABELS[currentLevel]}</p>
          </div>
          <p className="text-text-secondary text-sm">
            {currentLevel < 4
              ? `Complete sessions consistently to advance to ${LEVEL_LABELS[currentLevel + 1]}.`
              : 'You have reached the highest level for this pattern.'}
          </p>
        </div>
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div className="flex flex-col gap-3 pb-6">
          <p className="text-text-disabled text-xs tracking-widest">RECENT SESSIONS</p>
          {history.slice(0, 10).map((s, i) => (
            <div key={i} className="bg-surface rounded-card p-4 flex items-center justify-between">
              <div>
                <p className="text-text-primary font-bold text-sm">{SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}</p>
                <p className="text-text-disabled text-xs">
                  {new Date(s.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary text-sm">{s.total_sets} sets</p>
                {s.score_awarded > 0 && <p className="text-accent text-xs font-bold">+{s.score_awarded}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}