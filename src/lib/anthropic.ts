interface PTContext {
  exerciseName: string
  sessionType: string
  progressionLevels: Record<string, number>
  lastSessionSummary: string
  activePainFlags: string[]
}

export async function callPT(
  userMsg: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  ctx: PTContext
): Promise<string> {
  const system = `You are the personal trainer inside a fitness app called Untrained.
Keep ALL responses to 1-3 sentences. No lists. No bullet points. Trainer voice: direct, brief, human.
When given rep/effort data: confirm in one line. Example: "8 reps, felt that last one — logged."
If pain mentioned: say "Noted — we'll check in after." then stop. Never diagnose or alarm.
Current exercise: ${ctx.exerciseName} | Session type: ${ctx.sessionType}
User levels: ${JSON.stringify(ctx.progressionLevels)}
Last session: ${ctx.lastSessionSummary}
Active pain flags: ${ctx.activePainFlags.join(', ') || 'none'}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages: [...history.slice(-8), { role: 'user', content: userMsg }],
    }),
  })
  if (!res.ok) throw new Error('API failed')
  const data = await res.json() as { content: { text: string }[] }
  return data.content[0].text
}