'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface FeedEvent {
  id: string
  table: string
  event_type: string
  severity: string
  title: string
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
}

const MAX_EVENTS = 100

function toFeedEvent(table: string, row: Record<string, unknown>): FeedEvent {
  switch (table) {
    case 'alerts':
      return {
        id: row.id as string,
        table,
        event_type: (row.type as string) || 'alert',
        severity: (row.severity as string) || 'info',
        title: (row.title as string) || 'Alert',
        message: (row.message as string) || '',
        metadata: row.metadata as Record<string, unknown> | undefined,
        timestamp: (row.created_at as string) || new Date().toISOString(),
      }
    case 'recovery_actions':
      return {
        id: row.id as string,
        table,
        event_type: (row.action as string) || 'recovery',
        severity: (row.status as string) === 'success' ? 'success' : 'warning',
        title: `Recovery: ${row.action}`,
        message: (row.result as string) || `${row.action} on invoice ${row.invoice_id}`,
        metadata: { amount: row.amount, currency: row.currency, invoice_id: row.invoice_id },
        timestamp: (row.created_at as string) || new Date().toISOString(),
      }
    case 'webhook_events':
      return {
        id: row.id as string,
        table,
        event_type: (row.event_type as string) || 'webhook',
        severity: 'info',
        title: `Webhook: ${row.event_type}`,
        message: `Stripe event ${row.stripe_event_id || row.id}`,
        metadata: { stripe_event_id: row.stripe_event_id },
        timestamp: (row.created_at as string) || new Date().toISOString(),
      }
    case 'dunning_sequences':
      return {
        id: row.id as string,
        table,
        event_type: 'dunning_update',
        severity: (row.status as string) === 'recovered' ? 'success' : 'info',
        title: `Dunning: ${row.status} (step ${row.step})`,
        message: `${row.customer_email} - $${row.amount} ${row.currency}`,
        metadata: { invoice_id: row.invoice_id, step: row.step, status: row.status },
        timestamp: (row.created_at as string) || new Date().toISOString(),
      }
    case 'n8n_workflow_runs':
      return {
        id: row.id as string,
        table,
        event_type: 'n8n_run',
        severity: (row.status as string) === 'success' ? 'success' : (row.status as string) === 'failed' ? 'critical' : 'info',
        title: `n8n: ${row.workflow_name || row.workflow_id}`,
        message: `${row.status} - ${row.event_type || 'workflow run'}`,
        metadata: { workflow_id: row.workflow_id, duration_ms: row.duration_ms },
        timestamp: (row.created_at as string) || new Date().toISOString(),
      }
    default:
      return {
        id: (row.id as string) || crypto.randomUUID(),
        table,
        event_type: table,
        severity: 'info',
        title: `${table} updated`,
        message: JSON.stringify(row).slice(0, 120),
        timestamp: new Date().toISOString(),
      }
  }
}

const TABLES = ['alerts', 'recovery_actions', 'webhook_events', 'dunning_sequences', 'n8n_workflow_runs'] as const

export function useRealtimeFeed(userId: string | null) {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const addEvent = useCallback((event: FeedEvent) => {
    setEvents(prev => {
      if (prev.some(e => e.id === event.id)) return prev
      return [event, ...prev].slice(0, MAX_EVENTS)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel('revguard-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${userId}` },
        (payload) => addEvent(toFeedEvent('alerts', payload.new as Record<string, unknown>)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recovery_actions', filter: `user_id=eq.${userId}` },
        (payload) => addEvent(toFeedEvent('recovery_actions', payload.new as Record<string, unknown>)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'webhook_events', filter: `user_id=eq.${userId}` },
        (payload) => addEvent(toFeedEvent('webhook_events', payload.new as Record<string, unknown>)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dunning_sequences', filter: `user_id=eq.${userId}` },
        (payload) => addEvent(toFeedEvent('dunning_sequences', payload.new as Record<string, unknown>)))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_workflow_runs', filter: `user_id=eq.${userId}` },
        (payload) => addEvent(toFeedEvent('n8n_workflow_runs', payload.new as Record<string, unknown>)))
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, addEvent])

  const clearEvents = useCallback(() => setEvents([]), [])

  return { events, connected, clearEvents }
}
