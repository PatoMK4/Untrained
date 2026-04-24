// Lite mode scripted responses - keyed by ParsedLog type + effort
export const CHAT_SCRIPTS = {
  reps_logged: (n: number) => `${n} reps — logged. ✓`,
  effort_easy: 'Easy one. Good controlled work.',
  effort_medium: "Solid. That's where the growth happens.",
  effort_hard: "You pushed. That's what this is about.",
  pain_detected: "Noted — we'll check in on that after.",
  weight_added: (kg: number) => `${kg}kg added — logged. ✓`,
  rest_granted: 'Take your time.',
  set_done: "Good. Rest up, then we go again.",
  skip_acknowledged: "Noted. We'll adjust.",
  motivation: "You're here. That already counts. One more.",
  session_end: "Good work today. Let's see what you've got next session.",
  unknown: 'Got it.',
} as const
