import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSessionStore } from '@/stores/sessionStore'
import { parseMessage } from '@/lib/chatParser'
import { hasPainSignal } from '@/lib/painDetector'
import { callPT } from '@/lib/anthropic'
import { useUserSettings } from '@/hooks/useScore'
import type { ParsedLog } from '@/types/app.types'
import type { LiteContext } from '@/constants/chatScripts'
import {
  getRepsResponse, getEffortResponse, getWeightResponse,
  getDoneResponse, getRestResponse, getSkipResponse,
  getPainResponse, getMotivationResponse, getUnknownResponse,
  getSessionEndResponse,
} from '@/constants/chatScripts'

export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// Determine Lite response using full session context
function getLiteResponse(
  parsed: ParsedLog,
  msg: string,
  ctx: LiteContext
): string {
  // Pain always takes priority
  if (hasPainSignal(msg)) return getPainResponse()

  switch (parsed.type) {
    case 'reps':
      return getRepsResponse(parsed.reps ?? 0, parsed.effort, ctx)
    case 'effort':
      return parsed.effort ? getEffortResponse(parsed.effort, ctx) : getUnknownResponse(ctx)
    case 'weight':
      return getWeightResponse(parsed.weightKg ?? 0, ctx)
    case 'done':
      return getDoneResponse(ctx)
    case 'rest':
      return getRestResponse()
    case 'skip':
      return getSkipResponse(ctx)
    default: {
      // Motivation signals
      if (/\b(?:tired|exhausted|don'?t want to|not feeling it|struggling today|bad day|no energy|drained|burnt? out)\b/.test(msg.toLowerCase())) {
        return getMotivationResponse(ctx)
      }
      // Session complete
      if (/\b(?:done|finished|complete|all done|session over|that'?s it)\b/.test(msg.toLowerCase())) {
        return getSessionEndResponse(ctx)
      }
      return getUnknownResponse(ctx)
    }
  }
}

export function useChat(sessionId: string | null) {
  const { user } = useAuthStore()
  const {
    flagPain,
    exercises,
    currentExerciseIndex,
    currentSetNumber,
    totalSets,
    painFlags,
    lastEffortByExercise,
    consecutiveHardByExercise,
  } = useSessionStore()
  const { data: settings } = useUserSettings()
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showLoggedBar, setShowLoggedBar] = useState(false)

  // Pull readiness from sessionStorage (set by TodayPage at session start)
  const readiness = (sessionStorage.getItem('session_readiness') ?? null) as LiteContext['readiness']

  const currentExercise = exercises[currentExerciseIndex]
  const aiMode = settings?.ai_mode ?? 'lite'

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return
    const userMsg = text.trim()

    if (hasPainSignal(userMsg)) flagPain(userMsg)

    const userEntry: ChatEntry = { id: crypto.randomUUID(), role: 'user', content: userMsg }
    setMessages(prev => [...prev, userEntry])
    setLoading(true)

    const parsed: ParsedLog = parseMessage(userMsg)

    if (parsed.type === 'reps' || parsed.type === 'effort' || parsed.type === 'weight') {
      setShowLoggedBar(true)
      setTimeout(() => setShowLoggedBar(false), 2000)
    }

    // Build Lite context from live session state
    const liteCtx: LiteContext = {
      exerciseName: currentExercise?.name,
      setNumber: currentSetNumber,
      totalSets,
      readiness,
      consecutiveHard: currentExercise
        ? (consecutiveHardByExercise[currentExercise.id] ?? 0)
        : 0,
      lastReps: null,
    }

    let response = ''
    try {
      // Use Smart only if explicitly set AND key exists
      if (aiMode === 'smart' && import.meta.env.VITE_ANTHROPIC_API_KEY) {
        const lastEffort = currentExercise ? (lastEffortByExercise[currentExercise.id] ?? null) : null
        const history = messages.map(m => ({ role: m.role, content: m.content }))
        response = await callPT(userMsg, history, {
          exerciseName: currentExercise?.name ?? 'unknown',
          sessionType: 'workout',
          progressionLevels: {},
          lastSessionSummary: lastEffort ? `Last set effort: ${lastEffort}` : 'First set',
          activePainFlags: painFlags,
        })
      } else {
        // Lite is the default — no API, no latency, fully context-aware
        response = getLiteResponse(parsed, userMsg, liteCtx)
      }
    } catch {
      // Smart failed — fall back to Lite silently
      response = getLiteResponse(parsed, userMsg, liteCtx)
    }

    const assistantEntry: ChatEntry = { id: crypto.randomUUID(), role: 'assistant', content: response }
    setMessages(prev => [...prev, assistantEntry])
    setLoading(false)

    if (user && sessionId) {
      try {
        await supabase.from('chat_messages').insert([
          { session_id: sessionId, user_id: user.id, role: 'user', content: userMsg, mode_used: aiMode },
          { session_id: sessionId, user_id: user.id, role: 'assistant', content: response, mode_used: aiMode, parsed_log: parsed },
        ])
      } catch (err) {
        console.error('Failed to save chat messages:', err)
      }
    }
  }, [
    messages, sessionId, currentExercise, currentSetNumber, totalSets,
    flagPain, user, aiMode, painFlags, readiness,
    lastEffortByExercise, consecutiveHardByExercise,
  ])

  return { messages, loading, showLoggedBar, send }
}