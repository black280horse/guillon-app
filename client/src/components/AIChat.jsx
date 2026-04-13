import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// Lee el token del localStorage para las peticiones
function getToken() { return localStorage.getItem('token') }

// ── Utilidades de renderizado ─────────────────────────────────────────────────
function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-xs bg-zinc-700 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm">
          {msg.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-xs sm:max-w-sm">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-4 h-4 rounded-sm bg-[#E8A020]/20 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-[#E8A020]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-zinc-500 text-xs">Guillon IA</span>
        </div>
        <div className={`bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-3 rounded-2xl rounded-tl-sm leading-relaxed whitespace-pre-line ${msg.streaming ? 'border-[#E8A020]/20' : ''}`}>
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-1.5 h-4 bg-[#E8A020] ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  '¿Cuál fue mi mejor producto este mes?',
  '¿Qué ROAS estoy logrando en promedio?',
  '¿Cómo mejorar mi rentabilidad?',
  '¿Qué producto debería escalar?',
]

// ── Panel de chat ─────────────────────────────────────────────────────────────
function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const abortRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const userText = text ?? input.trim()
    if (!userText || streaming) return
    setInput('')

    const userMsg = { role: 'user', content: userText }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)

    // Placeholder del asistente con streaming
    const assistantIdx = newHistory.length
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])
    setStreaming(true)

    // Convertir historial al formato de la API (solo user/assistant)
    const apiMessages = newHistory.map(m => ({ role: m.role, content: m.content }))

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      })

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) {
              accumulated = `Error: ${data.error}`
              break
            }
            if (data.text) {
              accumulated += data.text
              setMessages(prev => {
                const updated = [...prev]
                updated[assistantIdx] = { role: 'assistant', content: accumulated, streaming: true }
                return updated
              })
            }
          } catch { /* línea incompleta */ }
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[assistantIdx] = { role: 'assistant', content: accumulated, streaming: false }
        return updated
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[assistantIdx] = {
            role: 'assistant',
            content: 'Error al conectar con la IA. Verificá que ANTHROPIC_API_KEY esté configurada.',
            streaming: false,
          }
          return updated
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8A020]/10 border border-[#E8A020]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#E8A020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Asistente IA</p>
            <p className="text-zinc-600 text-xs">Claude · Guillon AP</p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-zinc-500 text-sm text-center">
              Preguntame sobre tus ventas, productos o estrategia de negocio.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-left text-xs text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-2.5 rounded-xl transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Preguntá algo sobre tus ventas…"
            disabled={streaming}
            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-[#E8A020]/50 text-white text-sm px-3 py-2 rounded-xl focus:outline-none transition-colors placeholder:text-zinc-600 disabled:opacity-50"
          />
          {streaming ? (
            <button onClick={handleStop}
              className="w-9 h-9 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center transition-colors hover:bg-red-500/20 shrink-0">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
            </button>
          ) : (
            <button onClick={() => sendMessage()} disabled={!input.trim()}
              className="w-9 h-9 bg-[#E8A020] hover:bg-[#d4911c] text-black rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Botón flotante + panel deslizable ─────────────────────────────────────────
export default function AIChat() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Panel lateral */}
      <div className={`fixed right-0 z-50 flex flex-col transition-all duration-300 ease-out
        ${open
          ? 'bottom-0 w-full sm:w-80 h-[520px] sm:bottom-24 sm:right-4 sm:rounded-2xl rounded-t-2xl lg:bottom-6'
          : 'bottom-0 w-0 h-0 overflow-hidden'
        } bg-[#0f0f12] border border-zinc-800 shadow-2xl`}>
        {open && <ChatPanel onClose={() => setOpen(false)} />}
      </div>

      {/* Botón flotante — sobre el bottom nav en mobile */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 right-4 z-50 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 lg:bottom-6
          ${open
            ? 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white'
            : 'bg-[#E8A020] hover:bg-[#d4911c] text-black'
          }`}
        style={{ width: 52, height: 52 }}
        title="Asistente IA"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </button>
    </>
  )
}
