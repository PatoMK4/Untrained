// src/hooks/useChat.ts
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSessionStore } from '@/stores/sessionStore'
import { parseMessage } from '@/lib/chatParser'
import { hasPainSignal } from '@/lib/painDetector'
import { callPT } from '@/lib/anthropic'
import { useUserSettings } from '@/hooks/useScore'
import type { ParsedLog, Effort } from '@/types/app.types'
import type { LiteContext } from '@/constants/chatScripts'
import {
  getRepsResponse, getEffortResponse, getWeightResponse,
  getDoneResponse, getRestResponse, getSkipResponse,
  getPainResponse, getMotivationResponse, getUnknownResponse,
} from '@/constants/chatScripts'

export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function getLiteResponse(parsed: ParsedLog, msg: string, ctx: LiteContext): string {
  if (hasPainSignal(msg)) return getPainResponse()
  switch (parsed.type) {
    case 'reps': return getRepsResponse(parsed.reps ?? 0, parsed.effort as Effort | undefined, ctx)
    case 'effort': return parsed.effort ? getEffortResponse(parsed.effort as Effort, ctx) : getUnknownResponse(ctx)
    case 'weight': return getWeightResponse(parsed.weightKg ?? 0, ctx)
    case 'done': return getDoneResponse(ctx)
    case 'rest': return getRestResponse()
    case 'skip': return getSkipResponse(ctx)
    default: {
      if (/\b(?:tired|exhausted|don'?t want to|not feeling it|struggling|bad day|no energy|drained)\b/.test(msg.toLowerCase())) {
        return getMotivationResponse(ctx)
      }
      return getUnknownResponse(ctx)
    }
  }
}

export function useChat(sessionId: string | null) {
  const { user } = useAuthStore()
  const {
    flagPain, exercises, currentExerciseIndex,
    currentSetNumber, totalSets, painFlags,
    lastEffortByExercise, consecutiveHardByExercise,
    logSet, nextSet,
  } = useSessionStore()
  const { data: settings } = useUserSettings()
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showLoggedBar, setShowLoggedBar] = useState(false)

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

    // When chat parses reps, actually log the set — same path as tap UI
    if (parsed.type === 'reps' && parsed.reps !== undefined && currentExercise && sessionId && user) {
      const effort: Effort = (parsed.effort as Effort | undefined) ?? 'medium'
      logSet({
        exerciseId: currentExercise.id, setNumber: currentSetNumber,
        reps: parsed.reps, durationSeconds: null,
        effort, extraWeightKg: null, loggedVia: 'chat',
      })
      try {
        await supabase.from('exercise_logs').insert({
          session_id: sessionId, user_id: user.id,
          exercise_id: currentExercise.id, set_number: currentSetNumber,
          reps: parsed.reps, duration_seconds: null,
          effort, extra_weight_kg: null,
          logged_via: 'chat', skipped: false, skip_reason: null,
        })
      } catch (err) { console.error('Failed to log set from chat:', err) }
      nextSet(effort, currentExercise.id)
      setShowLoggedBar(true)
      setTimeout(() => setShowLoggedBar(false), 2000)
    } else if (parsed.type === 'weight' || parsed.type === 'effort') {
      setShowLoggedBar(true)
      setTimeout(() => setShowLoggedBar(false), 1500)
    }

    const liteCtx: LiteContext = {
      exerciseName: currentExercise?.name,
      setNumber: currentSetNumber,
      totalSets,
      readiness,
      consecutiveHard: currentExercise ? (consecutiveHardByExercise[currentExercise.id] ?? 0) : 0,
      lastReps: parsed.type === 'reps' ? (parsed.reps ?? null) : null,
    }

    let response = ''
    try {
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
        response = getLiteResponse(parsed, userMsg, liteCtx)
      }
    } catch {
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
      } catch (err) { console.error('Failed to save chat messages:', err) }
    }
  }, [
    messages, sessionId, currentExercise, currentSetNumber, totalSets,
    flagPain, logSet, nextSet, user, aiMode, painFlags, readiness,
    lastEffortByExercise, consecutiveHardByExercise,
  ])

  return { messages, loading, showLoggedBar, send }
}