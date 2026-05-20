import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { estimateCalories } from '@/lib/workoutEngine'
import { useSessionStore } from '@/stores/sessionStore'
import { useCompleteSession } from '@/hooks/useWorkout'
import { awardSessionScore } from '@/lib/scoreEngine'
import { runProgressionCheck } from '@/lib/progressionEngine'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

interface Props { onDone: () => void }

const REFLECTION_OPTIONS = [
  { value: 'loved_it',    label: 'NAILED IT', num: '5' },
  { value: 'good',        label: 'SOLID',     num: '4' },
  { value: 'fine',        label: 'FINE',      num: '3' },
  { value: 'tough',       label: 'HARD',      num: '2' },
  { value: 'really_hard', label: 'GASSED',    num: '1' },
] as const

type Reflection = typeof REFLECTION_OPTIONS[number]['value']

const mono: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}

export function PostWorkout({ onDone }: Props) {
  const { user } = useAuthStore()
  const { logs, painFlags, exercises, endSession } = useSessionStore()
  const completeSession = useCompleteSession()

  const [painResponse, setPainResponse] = useState<'none' | 'minor' | 'hurt' | null>(null)
  const [painNote, setPainNote] = useState('')
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [scoreAwarded, setScoreAwarded] = useState(0)
  const [saving, setSaving] = useState(false)
  const [progressionUnlocked, setProgressionUnlocked] = useState(false)

  const showPainCheck = painFlags.length > 0
  const totalSets = logs.length
  const totalReps = logs.reduce((sum, l) => sum + (l.reps ?? 0), 0)
  const avgReps = totalSets > 0 ? totalReps / totalSets : 0
  const estimatedCals = estimateCalories(totalSets, avgReps)
  const easyCount = logs.filter(l => l.effort === 'easy').length
  const mediumCount = logs.filter(l => l.effort === 'medium').length
  const hardCount = logs.filter(l => l.effort === 'hard').length
  const hasWarmup = exercises.some(e => e.is_warmup)
  const hasCooldown = exercises.some(e => e.is_cooldown)
  const warmupLogged = hasWarmup && logs.some(l => exercises.find(e => e.id === l.exerciseId && e.is_warmup))
  const cooldownLogged = hasCooldown && logs.some(l => exercises.find(e => e.id === l.exerciseId && e.is_cooldown))
  const fullBookends = warmupLogged && cooldownLogged

  useEffect(() => {
    const saveSession = async () => {
      const sessionId = useSessionStore.getState().sessionId
      if (!sessionId || !user || saving) return
      setSaving(true)
      try {
        const exercisesCompleted = [...new Set(logs.map(l => l.exerciseId))]
        await completeSession.mutateAsync({ sessionId, totalSets, totalReps, exercisesCompleted, painNote: undefined, painFlagged: false })
        const progressed = await runProgressionCheck(user.id, sessionId)
        setProgressionUnlocked(progressed)
        const points = await awardSessionScore(user.id, sessionId, { progressionUnlocked: progressed, fullBookends })
        setScoreAwarded(points)
      } catch (err) { console.error('Error saving session:', err) }
      finally { setSaving(false) }
    }
    saveSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDone = async () => {
    setIsDone(true)
    const sessionId = useSessionStore.getState().sessionId
    if (sessionId && user) {
      try {
        const updates: Record<string, unknown> = {}
        if (reflection) updates.post_reflection = reflection
        if (painFlags.length > 0 && painResponse !== null) {
          updates.pain_flagged = painResponse === 'minor' || painResponse === 'hurt'
          if ((painResponse === 'minor' || painResponse === 'hurt') && painNote) updates.pain_note = painNote
        }
        if (Object.keys(updates).length > 0) await supabase.from('workout_sessions').update(updates).eq('id', sessionId)
      } catch (err) { console.error('Error updating session:', err) }
    }
    endSession()
    onDone()
  }

  // suppress unused var warning
  void estimatedCals

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', paddingTop: 48, paddingBottom: 40 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="ut-pulse" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#c8ff00' }} />
        <span style={{ ...mono, color: '#c8ff00' }}>● COMPLETE</span>
      </div>
      <div style={{
        fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
        fontWeight: 800, fontSize: 110, lineHeight: 0.85,
        letterSpacing: '-0.025em', color: '#f4f4f3', marginBottom: 8,
      }}>DONE.</div>
      <div style={{
        fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
        fontWeight: 500, fontSize: 30, color: '#c9c9c7', letterSpacing: '0.01em', marginBottom: 32,
      }}>Good work.</div>

      {/* Hero stats */}
      <div style={{ display: 'flex', borderTop: '1px solid #242424', borderBottom: '1px solid #242424', marginBottom: 32 }}>
        {[
          ['TIME', `${Math.floor(totalSets * 2.5)}:00`, 'MIN'],
          ['VOL', String(totalSets), 'SETS'],
          ['REPS', String(totalReps), ''],
        ].map(([k, v, u], i, a) => (
          <div key={k} style={{ flex: 1, padding: '20px 16px', borderRight: i < a.length - 1 ? '1px solid #242424' : 'none' }}>
            <div style={{ ...mono, color: '#8a8a86' }}>{k}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
              <span style={{ fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontWeight: 700, fontSize: 34, color: '#f4f4f3', letterSpacing: '-0.01em' }}>{v}</span>
              {u && <span style={{ ...mono, color: '#8a8a86' }}>{u}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 6 }}>SCORE EARNED</div>
          <div style={{ fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontWeight: 800, fontSize: 56, color: '#c8ff00', lineHeight: 1, letterSpacing: '-0.01em' }}>
            {saving ? '—' : `+${scoreAwarded}`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {easyCount > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22CC66' }} /><span style={{ ...mono, color: '#8a8a86' }}>{easyCount} easy</span></div>}
          {mediumCount > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8ff00' }} /><span style={{ ...mono, color: '#8a8a86' }}>{mediumCount} solid</span></div>}
          {hardCount > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb02e' }} /><span style={{ ...mono, color: '#8a8a86' }}>{hardCount} hard</span></div>}
        </div>
      </div>

      {(fullBookends || progressionUnlocked) && (
        <div style={{ padding: '12px 14px', border: '1px solid rgba(200,255,0,0.3)', background: 'rgba(200,255,0,0.05)', borderRadius: 2, marginBottom: 32 }}>
          {fullBookends && <div style={{ ...mono, color: '#c8ff00' }}>★ WARM-UP & COOL-DOWN +5 PTS</div>}
          {progressionUnlocked && <div style={{ ...mono, color: '#c8ff00', marginTop: fullBookends ? 6 : 0 }}>★ LEVEL UP +25 PTS</div>}
        </div>
      )}

      {/* How did that feel */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...mono, color: '#8a8a86', marginBottom: 12 }}>HOW DID THAT FEEL?</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {REFLECTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setReflection(opt.value)}
              style={{
                flex: 1, padding: '14px 4px', textAlign: 'center',
                border: `1px solid ${reflection === opt.value ? '#c8ff00' : '#2e2e2e'}`,
                background: reflection === opt.value ? 'rgba(200,255,0,0.07)' : 'transparent',
                borderRadius: 2, cursor: 'pointer',
              }}
            >
              <div style={{ fontFamily: '"Barlow Condensed","Arial Narrow",sans-serif', fontSize: 18, fontWeight: 700, color: reflection === opt.value ? '#c8ff00' : '#c9c9c7' }}>{opt.num}</div>
              <div style={{ ...mono, fontSize: 9, color: reflection === opt.value ? '#c8ff00' : '#8a8a86', marginTop: 4 }}>{opt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pain check */}
      {showPainCheck && painResponse === null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, padding: '14px 16px', border: '1px solid rgba(255,176,46,0.3)', background: 'rgba(255,176,46,0.05)', borderRadius: 2 }}>
          <div style={{ ...mono, color: '#ffb02e', marginBottom: 12 }}>Quick check — anything feel off?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['All good', 'none', '#f4f4f3'], ['Minor discomfort', 'minor', '#ffb02e'], ['Something hurt', 'hurt', '#ff4423']].map(([label, val, color]) => (
              <button key={val} onClick={() => setPainResponse(val as 'none' | 'minor' | 'hurt')} style={{
                height: 48, border: '1px solid #2e2e2e', background: '#131313', borderRadius: 2,
                ...mono, color: color as string, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </motion.div>
      )}

      {(painResponse === 'minor' || painResponse === 'hurt') && (
        <div style={{ marginBottom: 24, padding: '14px 16px', border: '1px solid #242424', background: '#131313', borderRadius: 2 }}>
          <div style={{ ...mono, color: '#8a8a86', marginBottom: 12 }}>Where did you feel it?</div>
          <input
            type="text" value={painNote} onChange={e => setPainNote(e.target.value)}
            placeholder="e.g. left shoulder, lower back"
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid #2e2e2e', paddingBottom: 8, outline: 'none',
              fontFamily: '"Barlow","Helvetica Neue",system-ui,sans-serif',
              fontSize: 16, color: '#f4f4f3',
            }}
          />
          <div style={{ ...mono, color: '#5d5d5a', marginTop: 8 }}>Coach will keep this in mind.</div>
        </div>
      )}

      {painResponse === 'none' && (
        <div style={{ ...mono, color: '#22CC66', marginBottom: 24 }}>✓ NOTHING TO FLAG.</div>
      )}

      {/* CTA */}
      {(painResponse !== null || !showPainCheck) && reflection !== null && (
        <div style={{ marginTop: 8 }}>
          <Button fullWidth size="lg" loading={isDone || saving} onClick={handleDone} sub="SAVE · CONTINUE">
            FINISH
          </Button>
        </div>
      )}
      {!reflection && (
        <div style={{ ...mono, color: '#5d5d5a', textAlign: 'center', marginTop: 16 }}>
          Select how it felt to continue
        </div>
      )}
    </motion.div>
  )
}
