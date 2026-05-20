import { sessionTypeLabel } from '@/lib/workoutEngine'
import type { Exercise, SessionType, TimeSlot } from '@/types/app.types'
import type { SessionConfig } from '@/lib/workoutEngine'

export type Readiness = 'great' | 'good' | 'tired'

interface Props {
  sessionType: SessionType
  timeSlot: TimeSlot
  warmup: Exercise[]
  main: Exercise[]
  cooldown: Exercise[]
  config: SessionConfig
  onTimeChange: (t: TimeSlot) => void
  onStart: (readiness: Readiness) => void
  isStarting: boolean
  isComeback?: boolean
  painFollowUp?: { note: string } | null
  onPainFollowUp?: (response: 'better' | 'same' | 'worse') => void
}

const C = {
  bg: '#050505', surf: '#131313', line: '#242424', line2: '#2e2e2e',
  fg: '#f4f4f3', fg2: '#c9c9c7', mute: '#8a8a86', mute2: '#5d5d5a',
  lime: '#c8ff00', amber: '#ffb02e',
}
const F = {
  disp: '"Barlow Condensed","Arial Narrow",sans-serif',
  mono: '"JetBrains Mono",ui-monospace,monospace',
  body: '"Barlow","Helvetica Neue",system-ui,sans-serif',
}

function tag(color = C.mute): React.CSSProperties {
  return { fontFamily: F.mono, fontSize: 10, letterSpacing: '0.18em', color, textTransform: 'uppercase' as const }
}

function estimateMins(warmup: number, main: number, cooldown: number, sets: number, rest: number) {
  return Math.round((warmup * 60 + cooldown * 60 + main * (sets * 45 + (sets - 1) * rest + 30)) / 60)
}

const WEEK_SLOTS = [
  { d: 'M', types: ['push', 'full_body', 'upper_lower'], abbr: 'PUSH' },
  { d: 'T', types: [] as string[], abbr: 'REST' },
  { d: 'W', types: ['pull'], abbr: 'PULL' },
  { d: 'T', types: [] as string[], abbr: 'REST' },
  { d: 'F', types: ['legs', 'squat'], abbr: 'LEGS' },
  { d: 'S', types: ['upper_lower'], abbr: 'UPPER' },
  { d: 'S', types: [] as string[], abbr: 'REST' },
]

export function WorkoutPreview({
  sessionType, warmup, main, cooldown, config, onStart, isStarting,
  isComeback, painFollowUp, onPainFollowUp,
}: Props) {
  const sessionLabel = sessionTypeLabel(sessionType).toUpperCase()
  const estimatedMins = estimateMins(warmup.length, main.length, cooldown.length, config.setsPerExercise, config.baseRestSeconds)
  const totalExercises = warmup.length + main.length + cooldown.length
  const totalSets = totalExercises * config.setsPerExercise

  const now = new Date()
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const todayIdx = now.getDay()

  const allExercises = [...warmup, ...main, ...cooldown]
  const readiness = 92

  return (
    <div style={{ overflowY: 'auto', paddingBottom: 120 }}>
      {/* top meta strip */}
      <div style={{ padding: '68px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, background: C.lime, borderRadius: '50%' }} />
          <span style={tag(C.fg2)}>WK 01 · {dayNames[todayIdx]} · {monthNames[now.getMonth()]} {now.getDate()}</span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 1c0 3-4 4-4 8a4 4 0 008 0c0-2-1-3-2-4 1 0 2 1 2 2 1-2-1-5-4-6z" fill={C.lime}/></svg>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: C.fg, letterSpacing: '0.06em', fontWeight: 600 }}>11</span>
        </div>
      </div>

      {/* Big heading */}
      <div style={{ padding: '20px 24px 0' }}>
        <span style={tag()}>{dayNames[todayIdx]}</span>
        <div style={{ fontFamily: F.disp, fontWeight: 800, fontSize: 86, color: C.fg, lineHeight: 0.88, letterSpacing: '-0.02em', marginTop: 6, textTransform: 'uppercase' }}>
          {sessionLabel.split(' ')[0]}<br/>DAY.
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 14 }}>
          <span style={tag()}>
            {estimatedMins} MIN · {totalExercises} LIFTS · {totalSets} SETS
          </span>
        </div>
      </div>

      {/* Comeback / pain banners */}
      {isComeback && (
        <div style={{ margin: '20px 24px 0', padding: '14px 16px', border: '1px solid rgba(200,255,0,0.3)', background: 'rgba(200,255,0,0.04)', borderRadius: 2 }}>
          <span style={tag(C.lime)}>WELCOME BACK</span>
          <div style={{ fontFamily: F.disp, fontSize: 20, fontWeight: 600, color: C.fg, marginTop: 6 }}>It's been a few days. No stress.</div>
          <div style={{ ...tag(), marginTop: 4, lineHeight: 1.6 }}>Session dialled back — build momentum.</div>
        </div>
      )}
      {painFollowUp && (
        <div style={{ margin: '20px 24px 0', padding: '14px 16px', border: '1px solid rgba(255,176,46,0.3)', background: 'rgba(255,176,46,0.04)', borderRadius: 2 }}>
          <span style={tag(C.amber)}>CHECKING IN</span>
          <div style={{ fontFamily: F.disp, fontSize: 20, fontWeight: 600, color: C.fg, marginTop: 6, marginBottom: 10 }}>
            You flagged: <span style={{ color: C.amber }}>{painFollowUp.note}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['better', 'same', 'worse'] as const).map(r => (
              <button key={r} onClick={() => onPainFollowUp?.(r)} style={{
                flex: 1, height: 40, background: 'transparent', border: '1px solid ' + C.line2,
                fontFamily: F.mono, fontSize: 10, color: C.fg2, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', borderRadius: 2,
              }}>{r}</button>
            ))}
          </div>
        </div>
      )}

      {/* GO button */}
      <div style={{ padding: '20px 24px 0' }}>
        <button
          onClick={() => !isStarting && onStart('good')}
          disabled={isStarting}
          style={{
            width: '100%', background: isStarting ? C.mute2 : C.lime, border: 0,
            padding: '20px 22px', cursor: isStarting ? 'default' : 'pointer',
            borderRadius: 2, textAlign: 'left',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'stretch',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: '#0a0a0a', opacity: 0.65, letterSpacing: '0.16em' }}>
                {isStarting ? 'STARTING…' : 'BEGIN SESSION · TAP TO GO'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <span style={{ fontFamily: F.disp, fontSize: 46, fontWeight: 800, color: '#0a0a0a', lineHeight: 1, letterSpacing: '-0.005em' }}>GO</span>
                <svg width="32" height="20" viewBox="0 0 32 20"><path d="M0 10h28M22 2l8 8-8 8" stroke="#0a0a0a" strokeWidth="2.5" fill="none"/></svg>
              </div>
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.18)', paddingTop: 10 }}>
              {[
                [String(estimatedMins), 'MIN'],
                [String(totalExercises).padStart(2, '0'), 'LIFTS'],
                [String(totalSets), 'SETS'],
                [main[0] ? String(config.setsPerExercise) : '—', 'SETS·EA'],
              ].map(([n, l], i, a) => (
                <div key={l} style={{ flex: 1, paddingLeft: i === 0 ? 0 : 10, borderRight: i < a.length - 1 ? '1px solid rgba(0,0,0,0.15)' : 'none' }}>
                  <div style={{ fontFamily: F.disp, fontSize: 18, fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}>{n}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 9, color: '#0a0a0a', opacity: 0.65, letterSpacing: '0.1em', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', borderLeft: '1px solid rgba(0,0,0,0.18)', paddingLeft: 16 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: '#0a0a0a', opacity: 0.7, letterSpacing: '0.14em', textAlign: 'right' }}>READINESS</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ position: 'relative', width: 8, height: 60, background: 'rgba(0,0,0,0.18)' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: readiness + '%', background: '#0a0a0a' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontFamily: F.disp, fontSize: 36, fontWeight: 800, color: '#0a0a0a', lineHeight: 1 }}>{readiness}</span>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: '#0a0a0a' }}>/100</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Today's lifts */}
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={tag()}>TODAY'S WORK</span>
          <span style={tag(C.fg2)}>EDIT</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
          {allExercises.slice(0, 5).map((ex, i) => {
            const repsLabel = ex.target_duration_seconds
              ? `${ex.target_duration_seconds}s`
              : ex.target_reps_min && ex.target_reps_max
              ? `${ex.target_reps_min}–${ex.target_reps_max}`
              : '—'
            const tag2 = i < warmup.length ? 'WARM' : i < warmup.length + main.length ? 'MAIN' : 'COOL'
            return (
              <div key={ex.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 0', borderBottom: i < 4 ? '1px solid ' + C.line : 'none',
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.1em', width: 18 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, letterSpacing: '0.01em' }}>{ex.name}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.08em', marginTop: 2 }}>
                    {config.setsPerExercise} × {repsLabel} · {tag2}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: F.mono, fontSize: 13, color: C.lime, fontWeight: 500, letterSpacing: '0.04em' }}>
                    —
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Coach note */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{
          border: '1px solid ' + C.line, background: C.surf, padding: '16px 18px',
          display: 'flex', gap: 14, alignItems: 'flex-start', borderRadius: 2,
        }}>
          <div style={{
            width: 36, height: 36, background: C.lime, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2,
          }}>
            <span style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 800, color: '#0a0a0a' }}>M</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: F.disp, fontSize: 14, fontWeight: 600, color: C.fg, letterSpacing: '0.06em' }}>MARLO</span>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.lime, letterSpacing: '0.12em' }}>● COACH</span>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 14, color: C.fg2, marginTop: 6, lineHeight: 1.5 }}>
              {isComeback
                ? "Welcome back. Light session today — focus on movement quality, not load."
                : `${sessionLabel.split(' ')[0]} day looking solid. Stick to form and push where you can.`}
            </div>
          </div>
        </div>
      </div>

      {/* Week strip */}
      <div style={{ padding: '24px 24px 0' }}>
        <span style={tag()}>THIS WEEK</span>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {WEEK_SLOTS.map((slot, i) => {
            const isNow = i === (todayIdx === 0 ? 6 : todayIdx - 1)
            return (
              <div key={i} style={{
                flex: 1, padding: '10px 6px',
                border: '1px solid ' + (isNow ? C.lime : C.line),
                background: isNow ? 'rgba(200,255,0,0.05)' : C.surf,
                textAlign: 'center', borderRadius: 2,
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: isNow ? C.lime : C.mute, letterSpacing: '0.1em' }}>{slot.d}</div>
                <div style={{ fontFamily: F.disp, fontSize: 13, fontWeight: 600, color: isNow ? C.lime : slot.abbr === 'REST' ? C.mute : C.fg, marginTop: 6, letterSpacing: '0.04em' }}>{slot.abbr}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
