import { createServiceRoleClient } from '@/lib/supabase/server'

interface NotificationLogEntry {
  channel: 'sms' | 'discord' | 'email' | 'push'
  recipient: string
  subject?: string
  body: string
  status: 'sent' | 'failed'
  error_message?: string
  related_entity_type?: string
  related_entity_id?: string
}

/**
 * Log a notification attempt to the notification_log table.
 * Fire-and-forget — errors are caught and logged to console.
 */
export async function logNotification(entry: NotificationLogEntry) {
  try {
    const supabase = await createServiceRoleClient()
    await supabase.from('notification_log').insert({
      channel: entry.channel,
      recipient: entry.recipient,
      subject: entry.subject || null,
      body: entry.body.slice(0, 2000),
      status: entry.status,
      error_message: entry.error_message || null,
      related_entity_type: entry.related_entity_type || null,
      related_entity_id: entry.related_entity_id || null,
    })
  } catch (err) {
    console.error('[notificationLog] Failed to log notification:', err)
  }
}

interface FailedWebhookEntry {
  source: string
  payload: Record<string, unknown>
  error_message: string
  status_code?: number
}

/**
 * Log a failed webhook to the failed_webhooks table.
 * Fire-and-forget — errors are caught and logged to console.
 */
export async function logFailedWebhook(entry: FailedWebhookEntry) {
  try {
    const supabase = await createServiceRoleClient()
    await supabase.from('failed_webhooks').insert({
      source: entry.source,
      payload: entry.payload,
      error_message: entry.error_message,
      status_code: entry.status_code || null,
      retry_count: 0,
      resolved: false,
    })
  } catch (err) {
    console.error('[notificationLog] Failed to log webhook failure:', err)
  }
}
