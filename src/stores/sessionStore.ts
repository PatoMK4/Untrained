import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Exercise, Effort } from '@/types/app.types'
import type { TimeSlot } from '@/lib/workoutEngine'

export interface SetLog {
  exerciseId: string
  setNumber: number
  reps: number | null
  durationSeconds: number | null
  effort: Effort
  extraWeightKg: number | null
  loggedVia: 'chat' | 'tap'
}

interface SessionState {
  sessionId: string | null
  isActive: boolean
  exercises: Exercise[]
  currentExerciseIndex: number
  currentSetNumber: number
  totalSets: number
  timeSlot: TimeSlot
  logs: SetLog[]
  painFlags: string[]
  startedAt: string | null  // ISO string for serialisation
  showRestTimer: boolean
  isPaused: boolean
  pausedAt: string | null
  totalPausedMs: number
  activeExerciseSeconds: number
  lastEffortByExercise: Record<string, Effort>
  consecutiveHardByExercise: Record<string, number>

  startSession: (id: string, exercises: Exercise[], timeSlot: TimeSlot, setsPerExercise: number) => void
  logSet: (log: SetLog) => void
  nextSet: (effort: Effort, exerciseId: string) => void
  nextExercise: () => void
  flagPain: (kw: string) => void
  setShowRestTimer: (v: boolean) => void
  pauseSession: () => void
  resumeSession: () => void
  addActiveSeconds: (seconds: number) => void
  endSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      isActive: false,
      exercises: [],
      currentExerciseIndex: 0,
      currentSetNumber: 1,
      totalSets: 3,
      timeSlot: 45 as TimeSlot,
      logs: [],
      painFlags: [],
      startedAt: null,
      showRestTimer: false,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
      activeExerciseSeconds: 0,
      lastEffortByExercise: {},
      consecutiveHardByExercise: {},

      startSession: (sessionId, exercises, timeSlot, setsPerExercise) =>
        set({
          sessionId, exercises, timeSlot, totalSets: setsPerExercise,
          isActive: true, currentExerciseIndex: 0, currentSetNumber: 1,
          logs: [], painFlags: [], startedAt: new Date().toISOString(),
          showRestTimer: false, isPaused: false, pausedAt: null,
          totalPausedMs: 0, activeExerciseSeconds: 0,
          lastEffortByExercise: {}, consecutiveHardByExercise: {},
        }),

      logSet: (log) => set((s) => ({ logs: [...s.logs, log] })),

      nextSet: (effort, exerciseId) =>
        set((s) => {
          const prevConsecutive = s.consecutiveHardByExercise[exerciseId] ?? 0
          const newConsecutive = effort === 'hard' ? prevConsecutive + 1 : 0
          return {
            currentSetNumber: s.currentSetNumber + 1,
            showRestTimer: true,
            lastEffortByExercise: { ...s.lastEffortByExercise, [exerciseId]: effort },
            consecutiveHardByExercise: { ...s.consecutiveHardByExercise, [exerciseId]: newConsecutive },
          }
        }),

      nextExercise: () =>
        set((s) => ({
          currentExerciseIndex: s.currentExerciseIndex + 1,
          currentSetNumber: 1,
          showRestTimer: false,
        })),

      flagPain: (kw) => set((s) => ({ painFlags: [...new Set([...s.painFlags, kw])] })),

      setShowRestTimer: (v) => set({ showRestTimer: v }),

      pauseSession: () => set((s) => {
        if (s.isPaused) return {}
        return { isPaused: true, pausedAt: new Date().toISOString() }
      }),

      resumeSession: () => set((s) => {
        if (!s.isPaused || !s.pausedAt) return {}
        const pausedMs = Date.now() - new Date(s.pausedAt).getTime()
        return { isPaused: false, pausedAt: null, totalPausedMs: s.totalPausedMs + pausedMs }
      }),

      addActiveSeconds: (seconds) =>
        set((s) => ({ activeExerciseSeconds: s.activeExerciseSeconds + seconds })),

      endSession: () =>
        set({
          sessionId: null, isActive: false, exercises: [], logs: [], painFlags: [],
          currentExerciseIndex: 0, currentSetNumber: 1, startedAt: null,
          showRestTimer: false, isPaused: false, pausedAt: null,
          totalPausedMs: 0, activeExerciseSeconds: 0,
          lastEffortByExercise: {}, consecutiveHardByExercise: {},
        }),
    }),
    {
      name: 'untrained-session',
      // Only persist active session data — skip derived UI state
      partialize: (s) => ({
        sessionId: s.sessionId,
        isActive: s.isActive,
        exercises: s.exercises,
        currentExerciseIndex: s.currentExerciseIndex,
        currentSetNumber: s.currentSetNumber,
        totalSets: s.totalSets,
        timeSlot: s.timeSlot,
        logs: s.logs,
        painFlags: s.painFlags,
        startedAt: s.startedAt,
        showRestTimer: s.showRestTimer,
        isPaused: s.isPaused,
        pausedAt: s.pausedAt,
        totalPausedMs: s.totalPausedMs,
        activeExerciseSeconds: s.activeExerciseSeconds,
        lastEffortByExercise: s.lastEffortByExercise,
        consecutiveHardByExercise: s.consecutiveHardByExercise,
      }),
    }
  )
)