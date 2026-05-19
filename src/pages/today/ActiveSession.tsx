import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SetLogger } from '@/components/workout/SetLogger'
import { useSessionStore } from '@/stores/sessionStore'
import { useLogSet, useRecentLogs, useExercises } from '@/hooks/useWorkout'
import { calculateRestSeconds } from '@/lib/workoutEngine'
import { supabase } from '@/lib/supabase'
import type { Effort, MovementPattern, Exercise } from '@/types/app.types'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface Props { onSessionEnd: () => void }

const KCAL_PER_ACTIVE_SECOND = 8 / 60

const mono: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}

function useElapsedTime(startedAt: string | null, isPaused: boolean, totalPausedMs: number): string {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const startMs = new Date(startedAt).getTime()
    const interval = setInterval(() => {
      if (!isPaused) setElapsed(Math.floor((Date.now() - startMs - totalPausedMs) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, isPaused, totalPausedMs])
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function RestTimer({ seconds, total, onDismiss, onComplete }: {
  seconds: number; total: number; onDismiss: () => void; onComplete: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => { setRemaining(seconds) }, [seconds])
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(interval); onCompleteRef.current(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [seconds])

  const warming = remaining <= 5
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const barPct = Math.max(0, (remaining / total) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 0' }}>
      <div style={{ ...mono, color: warming ? '#c8ff00' : '#ffb02e' }}>
        {warming ? '● REST ENDING' : '● REST'}
      </div>
      <div
        className={warming ? 'ut-beat' : ''}
        style={{
          fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
          fontWeight: 800, fontSize: 168, lineHeight: 0.9,
          letterSpacing: '-0.04em',
          color: warming ? '#c8ff00' : '#f4f4f3',
          transition: 'color 400ms ease',
        }}
      >
        {mm}:{ss}
      </div>
      <div style={{ width: '100%', maxWidth: 300, height: 2, background: '#2e2e2e', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: 2,
          width: `${barPct}%`,
          background: warming ? '#c8ff00' : '#ffb02e',
          transition: 'width 1000ms linear, background 600ms ease',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDismiss} style={{
          padding: '10px 16px', background: 'transparent', border: '1px solid #2e2e2e',
          ...mono, color: '#c9c9c7', cursor: 'pointer', borderRadius: 2,
        }}>SKIP →</button>
      </div>
    </div>
  )
}

export function ActiveSession({ onSessionEnd }: Props) {
  const {
    exercises, currentExerciseIndex, currentSetNumber, totalSets,
    timeSlot, showRestTimer, sessionId, logs, startedAt,
    isPaused, totalPausedMs, activeExerciseSeconds,
    logSet, nextSet, nextExercise, setShowRestTimer,
    lastEffortByExercise, consecutiveHardByExercise,
    pauseSession, resumeSession, addActiveSeconds,
  } = useSessionStore()

  const [showSwap, setShowSwap] = useState(false)
  const logSetMutation = useLogSet()
  const { data: allExercises } = useExercises()
  const elapsedTime = useElapsedTime(startedAt, isPaused, totalPausedMs)

  const showRestTimerRef = useRef(showRestTimer)
  const isPausedRef = useRef(isPaused)
  showRestTimerRef.current = showRestTimer
  isPausedRef.current = isPaused

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      if (!showRestTimerRef.current && !isPausedRef.current) addActiveSeconds(1)
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt])

  const estimatedCalories = Math.round(activeExerciseSeconds * KCAL_PER_ACTIVE_SECOND)
  const currentExercise = exercises[currentExerciseIndex]
  const nextExerciseItem = exercises[currentExerciseIndex + 1]
  const isLastExercise = currentExerciseIndex === exercises.length - 1
  const isLastSet = currentSetNumber > totalSets

  const { data: recentLogs } = useRecentLogs(currentExercise?.id ?? null)
  const lastSessionReps = recentLogs && recentLogs.length > 0 ? recentLogs[0].reps : null

  const dynamicRestSeconds = useMemo(() => {
    if (!currentExercise) return 75
    return calculateRestSeconds(
      currentExercise.muscle_group as MovementPattern,
      lastEffortByExercise[currentExercise.id] ?? null,
      consecutiveHardByExercise[currentExercise.id] ?? 0,
      timeSlot
    )
  }, [currentExercise, lastEffortByExercise, consecutiveHardByExercise, timeSlot])

  const currentExerciseLogs = logs.filter(l => l.exerciseId === currentExercise?.id)

  const swapCandidates = useMemo(() => {
    if (!allExercises || !currentExercise) return []
    const sessionIds = new Set(exercises.map(e => e.id))
    return (allExercises as Exercise[]).filter(e =>
      e.muscle_group === currentExercise.muscle_group &&
      e.equipment_required === currentExercise.equipment_required &&
      !sessionIds.has(e.id) &&
      e.progression_level === currentExercise.progression_level &&
      !e.is_warmup && !e.is_cooldown
    ).slice(0, 4)
  }, [allExercises, currentExercise, exercises])

  const getSectionLabel = () => {
    if (!currentExercise) return ''
    if (currentExercise.is_warmup) return 'WARM-UP'
    if (currentExercise.is_cooldown) return 'COOL-DOWN'
    return 'MAIN'
  }

  const handleLogSet = async (reps: number | null, duration: number | null, effort: Effort, weightKg: number | null) => {
    if (!sessionId || !currentExercise) return
    logSet({ exerciseId: currentExercise.id, setNumber: currentSetNumber, reps, durationSeconds: duration, effort, extraWeightKg: weightKg, loggedVia: 'tap' })
    await logSetMutation.mutateAsync({
      session_id: sessionId, exercise_id: currentExercise.id,
      set_number: currentSetNumber, reps, duration_seconds: duration,
      effort, extra_weight_kg: weightKg, logged_via: 'tap', skipped: false, skip_reason: null,
    })
    nextSet(effort, currentExercise.id)
  }

  const handleNextExercise = () => {
    setShowSwap(false)
    if (isLastExercise) onSessionEnd()
    else nextExercise()
  }

  const handleRestComplete = () => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100])
    if (isLastSet) handleNextExercise()
    else setShowRestTimer(false)
  }

  const handleSkipRest = () => {
    if (isLastSet) handleNextExercise()
    else setShowRestTimer(false)
  }

  const handleBack = async () => {
    if (showRestTimer) { setShowRestTimer(false); return }
    const lastLog = [...logs].reverse().find(l => l.exerciseId === currentExercise?.id)
    if (!lastLog || !sessionId) return
    const logsWithoutLast = [...logs]
    const lastIndex = logsWithoutLast.map(l => l.exerciseId).lastIndexOf(currentExercise!.id)
    if (lastIndex >= 0) logsWithoutLast.splice(lastIndex, 1)
    useSessionStore.setState({ logs: logsWithoutLast, currentSetNumber: lastLog.setNumber, showRestTimer: false })
    try {
      await supabase.from('exercise_logs').delete()
        .eq('session_id', sessionId).eq('exercise_id', currentExercise!.id).eq('set_number', lastLog.setNumber)
    } catch { /* non-fatal */ }
  }

  const handleSkipExercise = () => {
    setShowSwap(false)
    if (isLastExercise) onSessionEnd()
    else nextExercise()
  }

  const handleSwap = (replacement: Exercise) => {
    const updated = [...exercises]
    updated[currentExerciseIndex] = replacement
    useSessionStore.setState({ exercises: updated })
    setShowSwap(false)
  }

  if (!currentExercise) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 24 }}>
        <div style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif', fontWeight: 800, fontSize: 48, color: '#f4f4f3' }}>ALL DONE.</div>
        <button onClick={onSessionEnd} style={{
          width: '100%', height: 58, background: '#c8ff00',
          fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
          fontWeight: 700, fontSize: 24, letterSpacing: '0.04em', textTransform: 'uppercase',
          color: '#0a0a0a', border: 'none', borderRadius: 2, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        }}>
          END SESSION
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M0 7h20M14 1l6 6-6 6" stroke="#0a0a0a" strokeWidth="2" /></svg>
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 16, paddingBottom: 160 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => isPaused ? resumeSession() : pauseSession()}
            style={{ ...mono, color: '#c9c9c7', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16">
              <rect x="2" y="1" width="4" height="14" fill="#8a8a86" />
              <rect x="10" y="1" width="4" height="14" fill="#8a8a86" />
            </svg>
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ut-pulse" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ff4423' }} />
          <span className="ut-pulse" style={{ ...mono, color: '#ff4423' }}>REC · {getSectionLabel()}</span>
        </div>
      </div>

      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {exercises.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, background: i <= currentExerciseIndex ? '#c8ff00' : '#2e2e2e' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
        <span style={{ ...mono, color: '#c8ff00' }}>
          LIFT {String(currentExerciseIndex + 1).padStart(2, '0')} / {String(exercises.length).padStart(2, '0')}
        </span>
        <span style={{ ...mono, color: '#8a8a86' }}>{elapsedTime} ELAPSED</span>
      </div>

      {/* Exercise name */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentExerciseIndex}-${currentExercise.id}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 6 }}>NEXT UP</div>
          <div style={{
            fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
            fontWeight: 800, fontSize: 56, lineHeight: 0.92,
            letterSpacing: '-0.01em', color: '#f4f4f3',
          }}>
            {currentExercise.name.toUpperCase()}.
          </div>
          {lastSessionReps !== null && (
            <div style={{ ...mono, color: '#8a8a86', marginTop: 8 }}>PREV: {lastSessionReps} REPS</div>
          )}
          {!currentExercise.is_warmup && !currentExercise.is_cooldown && (
            <button
              onClick={() => setShowSwap(v => !v)}
              style={{
                ...mono, color: '#8a8a86', background: 'transparent',
                border: '1px solid #2e2e2e', padding: '6px 12px',
                borderRadius: 2, cursor: 'pointer', marginTop: 12,
              }}
            >SWAP</button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Swap panel */}
      {showSwap && (
        <div style={{ marginBottom: 20, padding: 12, border: '1px solid #242424', background: '#131313', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 4 }}>SWAP WITH</div>
          {swapCandidates.length === 0
            ? <span style={{ ...mono, color: '#8a8a86' }}>No alternatives.</span>
            : swapCandidates.map(ex => (
              <button key={ex.id} onClick={() => handleSwap(ex)} style={{
                height: 48, border: '1px solid #2e2e2e', background: '#1a1a1a', borderRadius: 2,
                fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
                fontSize: 20, fontWeight: 600, color: '#f4f4f3', padding: '0 16px', textAlign: 'left', cursor: 'pointer',
              }}>{ex.name}</button>
            ))
          }
          <button onClick={() => setShowSwap(false)} style={{ ...mono, color: '#5d5d5a', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 0' }}>CANCEL</button>
        </div>
      )}

      {/* Set log chips */}
      {currentExerciseLogs.length > 0 && !showSwap && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {currentExerciseLogs.map((l, i) => (
            <div key={i} style={{
              height: 28, padding: '0 10px', border: `1px solid ${l.effort === 'easy' ? 'rgba(34,204,102,0.4)' : l.effort === 'hard' ? 'rgba(255,176,46,0.4)' : '#2e2e2e'}`,
              borderRadius: 2, display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: l.effort === 'easy' ? '#22CC66' : l.effort === 'hard' ? '#ffb02e' : '#8a8a86',
            }}>
              <span>S{l.setNumber}</span>
              {l.reps !== null && <span>· {l.reps}</span>}
              {l.extraWeightKg !== null && l.extraWeightKg > 0 && <span>· {l.extraWeightKg}kg</span>}
            </div>
          ))}
        </div>
      )}

      {/* Consecutive hard warning */}
      {(consecutiveHardByExercise[currentExercise.id] ?? 0) >= 3 && !showRestTimer && (
        <div style={{ marginBottom: 16, padding: '10px 14px', border: '1px solid rgba(255,176,46,0.3)', background: 'rgba(255,176,46,0.05)', borderRadius: 2 }}>
          <span style={{ ...mono, color: '#ffb02e' }}>
            {consecutiveHardByExercise[currentExercise.id]} hard sets. Consider SWAP.
          </span>
        </div>
      )}

      {/* Main area */}
      <div style={{ marginBottom: 20 }}>
        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 0' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 6, height: 20, background: '#c9c9c7' }} />
                <div style={{ width: 6, height: 20, background: '#c9c9c7' }} />
              </div>
              <div style={{ ...mono, color: '#c9c9c7' }}>PAUSED</div>
            </motion.div>
          ) : showRestTimer ? (
            <motion.div key="rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RestTimer
                seconds={dynamicRestSeconds} total={dynamicRestSeconds}
                onDismiss={handleSkipRest} onComplete={handleRestComplete}
              />
              {nextExerciseItem && (
                <div style={{ marginTop: 16, padding: '14px 16px', border: '1px solid #242424', background: '#131313', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ ...mono, color: '#c8ff00', marginBottom: 4 }}>UP NEXT</div>
                    <div style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif', fontWeight: 600, fontSize: 24, color: '#f4f4f3' }}>
                      {nextExerciseItem.name.toUpperCase()}
                    </div>
                  </div>
                  <span style={{ color: '#8a8a86' }}>›</span>
                </div>
              )}
              {currentExerciseLogs.length > 0 && (() => {
                const last = currentExerciseLogs[currentExerciseLogs.length - 1]
                return (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ ...mono, color: '#8a8a86', marginBottom: 8 }}>
                      LAST SET · {currentExerciseLogs.length} OF {totalSets} — LOGGED
                    </div>
                    <div style={{ display: 'flex', border: '1px solid #242424', borderRadius: 2 }}>
                      {[
                        ['REPS', last.reps !== null ? String(last.reps) : '—', ''],
                        ['LOAD', last.extraWeightKg && last.extraWeightKg > 0 ? String(last.extraWeightKg) : 'BW', last.extraWeightKg ? 'KG' : ''],
                        ['EFFORT', last.effort ? last.effort.toUpperCase() : '—', ''],
                      ].map(([k, v, u], i, a) => (
                        <div key={k} style={{ flex: 1, padding: '12px 10px', borderRight: i < a.length - 1 ? '1px solid #242424' : 'none' }}>
                          <div style={{ ...mono, fontSize: 9, color: '#8a8a86' }}>{k}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                            <span style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif', fontSize: 24, fontWeight: 700, color: '#c8ff00' }}>{v}</span>
                            {u && <span style={{ ...mono, fontSize: 9, color: '#8a8a86' }}>{u}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          ) : !showSwap ? (
            <motion.div key={`set-${currentExerciseIndex}-${currentSetNumber}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {/* Set plan grid */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...mono, color: '#8a8a86', marginBottom: 8 }}>SET PLAN</div>
                <div style={{ border: '1px solid #242424', borderRadius: 2, display: 'grid', gridTemplateColumns: '40px 1fr 1fr 80px' }}>
                  {['SET', 'TARGET', 'LOAD', 'PREV'].map(h => (
                    <div key={h} style={{ padding: '10px 12px', borderBottom: '1px solid #242424' }}>
                      <div style={{ ...mono, fontSize: 9 }}>{h}</div>
                    </div>
                  ))}
                  {Array.from({ length: totalSets }).map((_, i) => {
                    const setNum = i + 1
                    const done = setNum < currentSetNumber
                    const active = setNum === currentSetNumber
                    const log = currentExerciseLogs.find(l => l.setNumber === setNum)
                    const isLast = i === totalSets - 1
                    const border = isLast ? 'none' : '1px solid #242424'
                    return [
                      <div key={`n${i}`} style={{ padding: '12px', borderBottom: border, borderRight: '1px solid #242424', fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 12, color: active ? '#c8ff00' : '#8a8a86' }}>
                        {String(setNum).padStart(2, '0')}
                      </div>,
                      <div key={`t${i}`} style={{ padding: '12px', borderBottom: border, borderRight: '1px solid #242424', fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontSize: 18, fontWeight: 600, color: done ? '#c8ff00' : active ? '#f4f4f3' : '#5d5d5a' }}>
                        {currentExercise.target_reps_min}–{currentExercise.target_reps_max}
                      </div>,
                      <div key={`l${i}`} style={{ padding: '12px', borderBottom: border, borderRight: '1px solid #242424', fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontSize: 18, fontWeight: 600, color: '#c8ff00' }}>
                        {log?.extraWeightKg ? `${log.extraWeightKg} KG` : 'BW'}
                      </div>,
                      <div key={`p${i}`} style={{ padding: '12px', borderBottom: border, fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 11, color: '#8a8a86', letterSpacing: '0.06em' }}>
                        {log ? `${log.reps ?? '—'}` : lastSessionReps ? `${lastSessionReps}` : '—'}
                      </div>,
                    ]
                  })}
                </div>
              </div>
              <SetLogger
                setNumber={currentSetNumber} totalSets={totalSets}
                targetRepsMin={currentExercise.target_reps_min}
                targetRepsMax={currentExercise.target_reps_max}
                targetDurationSeconds={currentExercise.target_duration_seconds}
                onLog={handleLogSet} isLogging={logSetMutation.isPending}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', border: '1px solid #242424', borderRadius: 2, marginBottom: 20 }}>
        {[['KCAL', `~${estimatedCalories}`], ['TIME', elapsedTime], ['SETS', `${currentExerciseLogs.length}/${totalSets}`]].map(([k, v], i, a) => (
          <div key={k} style={{ flex: 1, padding: '12px', borderRight: i < a.length - 1 ? '1px solid #242424' : 'none' }}>
            <div style={{ ...mono, fontSize: 9, color: '#8a8a86' }}>{k}</div>
            <div style={{ fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontSize: 22, fontWeight: 700, color: '#f4f4f3', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['UNDO', handleBack], ['SKIP', handleSkipExercise]].map(([label, handler]) => (
          <button key={label as string} onClick={handler as () => void} style={{
            flex: 1, height: 48, background: '#131313', border: '1px solid #242424',
            ...mono, color: '#c9c9c7', cursor: 'pointer', borderRadius: 2,
          }}>{label as string}</button>
        ))}
      </div>

      <ChatPanel sessionId={sessionId} />
    </div>
  )
}
