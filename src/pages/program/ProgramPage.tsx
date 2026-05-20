import { useMemo } from 'react'
import { useUserProfile } from '@/hooks/useWorkout'
import { useSessionHistory, useScore } from '@/hooks/useScore'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '@/types/app.types'

const C = {
  bg: '#050505', surf: '#131313', line: '#242424', line2: '#2e2e2e',
  fg: '#f4f4f3', fg2: '#c9c9c7', mute: '#8a8a86', lime: '#c8ff00',
}
const F = {
  disp: '"Barlow Condensed","Arial Narrow",sans-serif',
  mono: '"JetBrains Mono",ui-monospace,monospace',
  body: '"Barlow","Helvetica Neue",system-ui,sans-serif',
}

const tag = (color = C.mute): React.CSSProperties => ({
  fontFamily: F.mono, fontSize: 10, letterSpacing: '0.18em',
  color, textTransform: 'uppercase' as const,
})

// Day labels for current week (Mon-Sun)
const DAY_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Session type for each day of week by split
const SPLIT_SCHEDULE: Record<string, string[]> = {
  ppl:         ['PUSH', 'REST', 'PULL', 'REST', 'LEGS', 'UPPER', 'REST'],
  full_body:   ['FULL', 'REST', 'FULL', 'REST', 'FULL', 'REST',  'REST'],
  upper_lower: ['UPPER', 'LOWER', 'REST', 'UPPER', 'LOWER', 'REST', 'REST'],
  bro_split:   ['CHEST', 'BACK', 'REST', 'LEGS', 'ARMS', 'REST', 'REST'],
}

const SPLIT_LABELS: Record<string, string> = {
  full_body: 'FULL BODY', ppl: 'PUSH/PULL/LEGS',
  upper_lower: 'UPPER/LOWER', bro_split: 'BRO SPLIT',
}

// Session detail descriptions by split
const SESSION_DETAILS: Record<string, { day: string; type: string; focus: string }[]> = {
  ppl: [
    { day: 'MONDAY', type: 'PUSH', focus: 'CHEST · SHOULDERS · TRICEPS' },
    { day: 'WEDNESDAY', type: 'PULL', focus: 'BACK · BICEPS · REAR DELTS' },
    { day: 'FRIDAY', type: 'LEGS', focus: 'QUADS · HAMSTRINGS · GLUTES' },
    { day: 'SATURDAY', type: 'UPPER', focus: 'SHOULDERS · ARMS · CORE' },
  ],
  full_body: [
    { day: 'MONDAY', type: 'FULL', focus: 'SQUAT · PUSH · PULL · CORE' },
    { day: 'WEDNESDAY', type: 'FULL', focus: 'HINGE · PUSH · PULL · CORE' },
    { day: 'FRIDAY', type: 'FULL', focus: 'SQUAT · PUSH · PULL · CORE' },
  ],
  upper_lower: [
    { day: 'MONDAY', type: 'UPPER', focus: 'CHEST · BACK · SHOULDERS · ARMS' },
    { day: 'TUESDAY', type: 'LOWER', focus: 'QUADS · HAMSTRINGS · GLUTES · CORE' },
    { day: 'THURSDAY', type: 'UPPER', focus: 'CHEST · BACK · SHOULDERS · ARMS' },
    { day: 'FRIDAY', type: 'LOWER', focus: 'QUADS · HAMSTRINGS · GLUTES · CORE' },
  ],
  bro_split: [
    { day: 'MONDAY', type: 'CHEST', focus: 'CHEST · TRICEPS' },
    { day: 'TUESDAY', type: 'BACK', focus: 'BACK · BICEPS' },
    { day: 'THURSDAY', type: 'LEGS', focus: 'QUADS · HAMSTRINGS · GLUTES' },
    { day: 'FRIDAY', type: 'ARMS', focus: 'BICEPS · TRICEPS · SHOULDERS' },
  ],
}

export default function ProgramPage() {
  const { user } = useAuthStore()
  const { data: profile } = useUserProfile()
  const { data: historyRaw } = useSessionHistory()
  const { data: score } = useScore()

  const typedProfile = profile as UserProfile | undefined
  const sessions = (historyRaw ?? []) as { date: string; session_type: string }[]

  // Week number from profile creation date
  const startDate = typedProfile?.created_at ? new Date(typedProfile.created_at) : new Date(user?.created_at ?? '')
  const weeksElapsed = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (7 * 86400000)))
  const weekWithinCycle = ((weeksElapsed - 1) % 12) + 1 // 1–12

  // Current phase (4-week blocks)
  const phaseIdx = weekWithinCycle <= 4 ? 0 : weekWithinCycle <= 8 ? 1 : weekWithinCycle <= 11 ? 2 : 3
  const weekInPhase = [weekWithinCycle, weekWithinCycle - 4, weekWithinCycle - 8, 1][phaseIdx]
  const phaseProgress = phaseIdx === 3 ? 1 : weekInPhase / 4

  const phases = [
    { k: 'PHASE 1', v: 'ACCUMULATION',   wks: 'WK 01–04', active: phaseIdx === 0 },
    { k: 'PHASE 2', v: 'INTENSIFICATION', wks: 'WK 05–08', active: phaseIdx === 1 },
    { k: 'PHASE 3', v: 'PEAK',            wks: 'WK 09–11', active: phaseIdx === 2 },
    { k: 'DELOAD',  v: 'RECOVERY',        wks: 'WK 12',    active: phaseIdx === 3 },
  ]

  // Build current week calendar from actual session dates
  const currentWeekDays = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const dow = now.getDay()
    const daysFromMon = dow === 0 ? 6 : dow - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysFromMon)
    const sessionDates = new Set(sessions.map(s => s.date))
    const split = typedProfile?.split_preference ?? 'ppl'
    const schedule = SPLIT_SCHEDULE[split] ?? SPLIT_SCHEDULE.ppl

    return DAY_ABBR.map((d, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      return { d, type: schedule[i], done: sessionDates.has(dateStr), today: dateStr === todayStr }
    })
  }, [sessions, typedProfile])

  const split = typedProfile?.split_preference ?? 'ppl'
  const splitLabel = SPLIT_LABELS[split] ?? 'PUSH/PULL/LEGS'
  const sessionDetails = SESSION_DETAILS[split] ?? SESSION_DETAILS.ppl

  // Calculate estimated sets per session (3 sets × ~6 exercises)
  const setsEst = (typedProfile?.training_days ?? 4) >= 4 ? '18 SETS' : '15 SETS'
  const timeEst = (typedProfile?.training_days ?? 4) >= 4 ? '50 MIN' : '45 MIN'

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, overflowY: 'auto', paddingBottom: 120 }}>
      <div style={{ padding: '68px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={tag()}>WK {weekWithinCycle.toString().padStart(2, '0')} · {splitLabel}</div>
          <div style={tag(C.fg2)}>12 WK PROGRAM</div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{
            fontFamily: F.disp, fontWeight: 800, fontSize: 72,
            lineHeight: 0.9, letterSpacing: '-0.02em', color: C.fg, textTransform: 'uppercase',
          }}>
            WEEK<br/>{['ONE.','TWO.','THREE.','FOUR.','FIVE.','SIX.','SEVEN.','EIGHT.','NINE.','TEN.','ELEVEN.','TWELVE.'][weekWithinCycle - 1] ?? `${weekWithinCycle}.`}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.06em', marginTop: 10 }}>
            {phases[phaseIdx].k} · {phases[phaseIdx].v} · {typedProfile?.training_days ?? 4} SESSIONS / WK
          </div>
        </div>

        {/* Phase strip */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 1, background: C.line }}>
          {phases.map(p => (
            <div key={p.k} style={{
              background: p.active ? C.surf : C.bg,
              padding: '14px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={tag(p.active ? C.lime : C.mute)}>{p.k}</div>
                <div style={{
                  fontFamily: F.disp, fontSize: 20, fontWeight: 600,
                  color: p.active ? C.fg : C.mute, marginTop: 4, letterSpacing: '0.02em',
                }}>{p.v}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={tag(p.active ? C.lime : C.mute)}>{p.wks}</div>
                {p.active && (
                  <div style={{ marginTop: 6, width: 60, height: 2, background: C.line2, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: 2, width: `${Math.round(phaseProgress * 100)}%`, background: C.lime }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current week calendar */}
        <div style={{ marginTop: 30 }}>
          <div style={tag()}>THIS WEEK</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 10 }}>
            {currentWeekDays.map(day => (
              <div key={day.d} style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                border: '1px solid ' + (day.today ? C.lime : day.done ? C.line2 : C.line),
                background: day.today ? 'rgba(200,255,0,0.07)' : day.done ? C.surf : 'transparent',
                borderRadius: 2,
              }}>
                <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.08em', color: day.today ? C.lime : C.mute, opacity: 0.8 }}>{day.d}</div>
                <div style={{ fontFamily: F.disp, fontSize: 12, fontWeight: 700, color: day.today ? C.lime : day.done ? C.mute : day.type === 'REST' ? C.mute : C.fg2 }}>
                  {day.done ? '✓' : day.type[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session schedule */}
        <div style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={tag()}>SESSION SCHEDULE</div>
            <div style={tag(C.fg2)}>EDIT</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 1, background: C.line }}>
            {sessionDetails.map(s => (
              <div key={s.day} style={{ background: C.bg, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={tag()}>{s.day}</div>
                    <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, marginTop: 4, letterSpacing: '0.01em' }}>{s.type}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.06em', marginTop: 2 }}>{s.focus}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>{setsEst}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.08em', marginTop: 2 }}>{timeEst}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program summary */}
        <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.line }}>
          {[
            ['PROGRAM', splitLabel],
            ['DURATION', '12 WEEK CYCLE'],
            ['FREQUENCY', `${typedProfile?.training_days ?? 4} / WEEK`],
            ['SESSIONS DONE', String(score?.total_sessions ?? sessions.length)],
            ['DELOAD', 'EVERY WK 4'],
            ['COACH', 'MARLO · ADAPTIVE'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: C.bg, padding: '16px 14px' }}>
              <div style={tag()}>{k}</div>
              <div style={{ fontFamily: F.disp, fontSize: 17, fontWeight: 600, color: C.fg, marginTop: 6, letterSpacing: '0.01em' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
