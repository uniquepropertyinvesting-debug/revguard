"use client"

/**
 * AI hook wrapping Nxcode SDK
 *
 * Usage:
 *   const { chat, generate, chatStream } = useAI()
 */

import { useState, useCallback } from 'react'

// Nxcode SDK types (SDK loaded via script tag as global)
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatOptions {
  messages: ChatMessage[]
  model?: 'fast' | 'pro'
}

interface ChatResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

interface GenerateOptions {
  prompt: string
  model?: 'fast' | 'pro'
}

interface GenerateResponse {
  text: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

interface StreamChunk {
  content: string
  done: boolean
}

interface NxcodeSDK {
  ai: {
    chat(options: ChatOptions): Promise<ChatResponse>
    generate(options: GenerateOptions): Promise<GenerateResponse>
    chatStream(options: ChatOptions & { onChunk: (chunk: StreamChunk) => void }): Promise<void>
    generateStream(options: GenerateOptions & { onChunk: (chunk: StreamChunk) => void }): Promise<void>
  }
  ready(): Promise<void>
}

declare const Nxcode: NxcodeSDK

export function useAI() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chat = useCallback(async (options: ChatOptions): Promise<ChatResponse> => {
    setIsLoading(true)
    setError(null)
    try {
      await Nxcode.ready()
      return await Nxcode.ai.chat(options)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generate = useCallback(async (options: GenerateOptions): Promise<GenerateResponse> => {
    setIsLoading(true)
    setError(null)
    try {
      await Nxcode.ready()
      return await Nxcode.ai.generate(options)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const chatStream = useCallback(async (
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await Nxcode.ready()
      await Nxcode.ai.chatStream({ ...options, onChunk })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateStream = useCallback(async (
    options: GenerateOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await Nxcode.ready()
      await Nxcode.ai.generateStream({ ...options, onChunk })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI request failed'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    chat,
    generate,
    chatStream,
    generateStream,
    isLoading,
    error
  }
}

export type { ChatMessage, ChatOptions, ChatResponse, GenerateOptions, GenerateResponse, StreamChunk }
