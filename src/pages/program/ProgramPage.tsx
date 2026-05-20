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

const weeks = [
  {
    n: 1, days: [
      { d: 'MON', type: 'PUSH', done: true },
      { d: 'TUE', type: 'REST', done: true },
      { d: 'WED', type: 'PULL', done: true },
      { d: 'THU', type: 'REST', done: true },
      { d: 'FRI', type: 'LEGS', done: false, today: true },
      { d: 'SAT', type: 'UPPER', done: false },
      { d: 'SUN', type: 'REST', done: false },
    ]
  },
  {
    n: 2, days: [
      { d: 'MON', type: 'PUSH', done: false },
      { d: 'TUE', type: 'REST', done: false },
      { d: 'WED', type: 'PULL', done: false },
      { d: 'THU', type: 'REST', done: false },
      { d: 'FRI', type: 'LEGS', done: false },
      { d: 'SAT', type: 'UPPER', done: false },
      { d: 'SUN', type: 'REST', done: false },
    ]
  },
]

const phases = [
  { k: 'PHASE 1', v: 'ACCUMULATION', wks: 'WK 01–04', active: true },
  { k: 'PHASE 2', v: 'INTENSIFICATION', wks: 'WK 05–08', active: false },
  { k: 'PHASE 3', v: 'PEAK', wks: 'WK 09–11', active: false },
  { k: 'DELOAD', v: 'RECOVERY', wks: 'WK 12', active: false },
]

export default function ProgramPage() {
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, overflowY: 'auto', paddingBottom: 120 }}>
      <div style={{ padding: '68px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={tag()}>WK 01 · PUSH/PULL/LEGS</div>
          <div style={tag(C.fg2)}>12 WK PROGRAM</div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{
            fontFamily: F.disp, fontWeight: 800, fontSize: 72,
            lineHeight: 0.9, letterSpacing: '-0.02em', color: C.fg, textTransform: 'uppercase',
          }}>
            WEEK<br/>ONE.
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, letterSpacing: '0.06em', marginTop: 10 }}>
            PHASE 1 · ACCUMULATION · 4 SESSIONS / WK
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
                <div style={tag(p.active ? C.lime : C.mute2)}>{p.wks}</div>
                {p.active && (
                  <div style={{
                    marginTop: 6, width: 60, height: 2, background: C.line2, position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: 2, width: '25%', background: C.lime }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current week calendar */}
        <div style={{ marginTop: 30 }}>
          {weeks.map(wk => (
            <div key={wk.n} style={{ marginBottom: 24 }}>
              <div style={tag()}>WEEK {wk.n.toString().padStart(2, '0')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 10 }}>
                {wk.days.map(day => (
                  <div key={day.d} style={{
                    aspectRatio: '1', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 3,
                    border: '1px solid ' + (day.today ? C.lime : day.done ? C.line2 : C.line),
                    background: day.today ? 'rgba(200,255,0,0.07)' : day.done ? C.surf : 'transparent',
                    borderRadius: 2,
                  }}>
                    <div style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.08em', color: day.today ? C.lime : day.done ? C.mute : C.mute, opacity: 0.8 }}>{day.d}</div>
                    <div style={{ fontFamily: F.disp, fontSize: 12, fontWeight: 700, color: day.today ? C.lime : day.done ? C.mute : day.type === 'REST' ? C.mute : C.fg2 }}>{day.type[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Program detail */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={tag()}>SESSION SCHEDULE</div>
            <div style={tag(C.fg2)}>EDIT</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 1, background: C.line }}>
            {[
              { day: 'MONDAY', type: 'PUSH', focus: 'CHEST + TRICEPS', sets: '18 SETS', time: '52 MIN' },
              { day: 'WEDNESDAY', type: 'PULL', focus: 'BACK + BICEPS', sets: '16 SETS', time: '48 MIN' },
              { day: 'FRIDAY', type: 'LEGS', focus: 'QUADS + HAMSTRINGS', sets: '20 SETS', time: '60 MIN' },
              { day: 'SATURDAY', type: 'UPPER', focus: 'SHOULDERS + ARMS', sets: '14 SETS', time: '44 MIN' },
            ].map(s => (
              <div key={s.day} style={{ background: C.bg, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={tag()}>{s.day}</div>
                    <div style={{ fontFamily: F.disp, fontSize: 22, fontWeight: 600, color: C.fg, marginTop: 4, letterSpacing: '0.01em' }}>{s.type}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.06em', marginTop: 2 }}>{s.focus}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: C.lime, letterSpacing: '0.08em' }}>{s.sets}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, letterSpacing: '0.08em', marginTop: 2 }}>{s.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program summary */}
        <div style={{ marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.line }}>
          {[
            ['PROGRAM', 'PUSH/PULL/LEGS'],
            ['DURATION', '12 WEEK CYCLE'],
            ['FREQUENCY', '4 / WEEK'],
            ['VOLUME RAMP', '+5% WEEKLY'],
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
