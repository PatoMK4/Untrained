import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { useSessionStore } from '@/stores/sessionStore'

interface Props {
  sessionId: string | null
}

export function ChatPanel({ sessionId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const { messages, loading, showLoggedBar, send } = useChat(sessionId)
  const { exercises, currentExerciseIndex } = useSessionStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentExercise = exercises[currentExerciseIndex]

  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, expanded])

  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [expanded])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const msg = input
    setInput('')
    await send(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-30"
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <motion.div
        layout
        animate={{ height: expanded ? '85vh' : 52 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-20 left-0 right-0 mx-4 z-40 bg-surface rounded-2xl overflow-hidden"
        style={{ maxWidth: 448, marginLeft: 'auto', marginRight: 'auto' }}
      >
        {/* Logged bar */}
        <AnimatePresence>
          {showLoggedBar && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0 right-0 h-8 bg-accent flex items-center justify-center z-10"
            >
              <span className="text-navbar text-xs font-black tracking-widest">LOGGED ✓</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed bar */}
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full h-[52px] flex items-center justify-between px-4"
          >
            <span className="text-text-secondary text-sm font-bold">Chat with your PT</span>
            <span className="text-accent text-lg">↑</span>
          </button>
        )}

        {/* Expanded panel */}
        {expanded && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-raised flex-shrink-0">
              <div>
                <p className="text-text-primary font-black text-sm tracking-widest">YOUR PT</p>
                {currentExercise && (
                  <p className="text-text-disabled text-xs">{currentExercise.name}</p>
                )}
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-text-disabled text-xl leading-none w-10 h-10 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-text-disabled text-sm text-center mt-4">
                  Tell me your reps, effort, or just talk.
                </p>
              )}
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-surface-raised text-text-primary rounded-br-sm'
                        : 'bg-navbar border-l-4 border-accent text-text-primary rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-navbar border-l-4 border-accent rounded-2xl rounded-bl-sm px-4 py-2">
                    <span className="flex gap-1">
                      {[0,1,2].map(i => (
                        <motion.span
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 bg-accent rounded-full block"
                        />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-surface-raised">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="8 reps, felt easy…"
                  className="flex-1 h-10 bg-surface-raised rounded-pill px-4 text-text-primary text-sm outline-none border border-transparent focus:border-accent"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 bg-accent rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                >
                  <span className="text-navbar text-base leading-none">↑</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}
