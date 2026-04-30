import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSessionStore } from '@/stores/sessionStore'
import { parseMessage } from '@/lib/chatParser'
import { hasPainSignal } from '@/lib/painDetector'
import { callPT, getLiteResponse } from '@/lib/anthropic'
import { useUserSettings } from '@/hooks/useScore'
import type { ParsedLog } from '@/types/app.types'

export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function useChat(sessionId: string | null) {
  const { user } = useAuthStore()
  const { flagPain, exercises, currentExerciseIndex, painFlags } = useSessionStore()
  const { data: settings } = useUserSettings()
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showLoggedBar, setShowLoggedBar] = useState(false)

  const currentExercise = exercises[currentExerciseIndex]
  const aiMode = settings?.ai_mode ?? 'smart'

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return
    const userMsg = text.trim()

    // Pain detection — always silent, zero UI
    if (hasPainSignal(userMsg)) flagPain(userMsg)

    // Add user message
    const userEntry: ChatEntry = { id: crypto.randomUUID(), role: 'user', content: userMsg }
    setMessages(prev => [...prev, userEntry])
    setLoading(true)

    // Parse message
    const parsed: ParsedLog = parseMessage(userMsg)

    // Show logged bar for rep/effort/weight logs
    if (parsed.type === 'reps' || parsed.type === 'effort' || parsed.type === 'weight') {
      setShowLoggedBar(true)
      setTimeout(() => setShowLoggedBar(false), 2000)
    }

    let response = ''
    try {
      if (aiMode === 'smart' && import.meta.env.VITE_ANTHROPIC_API_KEY) {
        const history = messages.map(m => ({ role: m.role, content: m.content }))
        response = await callPT(userMsg, history, {
          exerciseName: currentExercise?.name ?? 'unknown',
          sessionType: 'workout',
          progressionLevels: {},
          lastSessionSummary: 'No previous data',
          activePainFlags: painFlags,
        })
      } else {
        response = getLiteResponse(parsed, userMsg)
      }
    } catch {
      response = getLiteResponse(parsed, userMsg)
    }

    const assistantEntry: ChatEntry = { id: crypto.randomUUID(), role: 'assistant', content: response }
    setMessages(prev => [...prev, assistantEntry])
    setLoading(false)

    // Save both messages to Supabase
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
  }, [messages, sessionId, currentExercise, flagPain, user, aiMode, painFlags])

  return { messages, loading, showLoggedBar, send }
}
