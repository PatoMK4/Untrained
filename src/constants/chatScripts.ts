export const CHAT_SCRIPTS = {
  reps_logged: (n: number) => `${n} reps — logged.`,
  effort_easy: "Easy day. Good. Rest shorter next set.",
  effort_medium: "Solid. That's where you want to be.",
  effort_hard: "Hard one. Noted — rest a bit longer before the next.",
  weight_added: (kg: number) => `${kg}kg added — logged.`,
  session_end: "Good work today. Session complete.",
  rest_granted: "Take the time you need.",
  skip_acknowledged: "Skipped. Moving on.",
  pain_detected: "Noted — we'll check in on that after the session.",
  motivation: "You're here. That already counts. One rep at a time.",
  unknown: "Got it.",
} as const
