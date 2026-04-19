"use client"

/**
 * AI Chat Box Component
 *
 * A chat interface using Nxcode AI. Add your own styling.
 */

import { useState, useRef, useEffect, FormEvent } from 'react'
import { useAI, type ChatMessage } from '../hooks/useAI'

interface ChatBoxProps {
  /** System prompt to set AI behavior */
  systemPrompt?: string
  /** Placeholder text for input */
  placeholder?: string
  /** Model to use: 'fast' (default) or 'pro' */
  model?: 'fast' | 'pro'
  /** Class name for styling */
  className?: string
  /** Called when a new message is added (for persistence) */
  onMessage?: (message: ChatMessage) => void
}

export function ChatBox({
  systemPrompt = 'You are a helpful assistant.',
  placeholder = 'Type a message...',
  model = 'fast',
  className,
  onMessage
}: ChatBoxProps) {
  const { chatStream, isLoading, error } = useAI()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setStreamingContent('')

    // Notify parent about new message (for persistence)
    onMessage?.(userMessage)

    try {
      const chatMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...newMessages
      ]

      let fullContent = ''
      await chatStream({ messages: chatMessages, model }, (chunk) => {
        fullContent += chunk.content
        setStreamingContent(fullContent)

        if (chunk.done) {
          const assistantMessage: ChatMessage = { role: 'assistant', content: fullContent }
          setMessages([...newMessages, assistantMessage])
          setStreamingContent('')

          // Notify parent about AI response (for persistence)
          onMessage?.(assistantMessage)
        }
      })
    } catch {
      // Error is handled by useAI hook
    }
  }

  return (
    <div className={className} data-chatbox>
      {/* Messages */}
      <div data-messages>
        {messages.length === 0 && (
          <div data-empty>Start a conversation...</div>
        )}

        {messages.map((msg, i) => (
          <div key={i} data-message data-role={msg.role}>
            {msg.content}
          </div>
        ))}

        {/* Streaming response */}
        {streamingContent && (
          <div data-message data-role="assistant" data-streaming>
            {streamingContent}
          </div>
        )}

        {error && <div data-error>{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} data-input-form>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
