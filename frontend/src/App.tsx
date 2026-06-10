import { useState, useRef, useEffect } from 'react'
import './App.css'

type Message = { role: 'user' | 'assistant'; content: string }

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight })
  }, [messages])

  async function send() {
    if (!input.trim() || streaming) return
    const userMsg: Message = { role: 'user', content: input }
    const next = [...messages, userMsg]
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          if (!event.trim()) continue
          let dataLine = ''
          let eventType = 'message'
          for (const line of event.split('\n')) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim()
            else if (line.startsWith('data:')) dataLine = line.slice(5).trim()
          }
          if (eventType === 'done' || !dataLine) continue
          const parsed = JSON.parse(dataLine) as { text?: string }
          if (parsed.text) {
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              copy[copy.length - 1] = { ...last, content: last.content + parsed.text }
              return copy
            })
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: `Error: ${String(err)}` }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="app">
      <div className="chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="hint">Type a message to start.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            <div className="role">{m.role}</div>
            <div className="content">{m.content || (streaming && i === messages.length - 1 ? '…' : '')}</div>
          </div>
        ))}
      </div>
      <div className="input-bar">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask anything…"
          disabled={streaming}
          autoFocus
        />
        <button onClick={send} disabled={streaming || !input.trim()}>Send</button>
      </div>
    </div>
  )
}
