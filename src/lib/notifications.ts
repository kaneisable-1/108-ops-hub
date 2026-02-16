import { logNotification } from '@/lib/notificationLog'

// ──────────────────────────────────────────────
// Discord
// ──────────────────────────────────────────────

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

interface SendDiscordOptions {
  content: string
  embeds?: DiscordEmbed[]
  /** Label for notification_log.recipient (e.g. 'hot-leads-channel') */
  recipientLabel?: string
  /** For notification_log tracking */
  relatedEntityType?: string
  relatedEntityId?: string
}

/**
 * Send a Discord message via webhook. Fire-and-forget safe.
 * Logs to notification_log table.
 */
export async function sendDiscord(options: SendDiscordOptions): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('[notifications] DISCORD_WEBHOOK_URL not set — skipping')
    return false
  }

  const recipient = options.recipientLabel || 'ops-channel'
  const bodyPreview = options.content.slice(0, 200)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: options.content,
        embeds: options.embeds,
      }),
    })

    await logNotification({
      channel: 'discord',
      recipient,
      body: bodyPreview,
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? undefined : `HTTP ${res.status}`,
      related_entity_type: options.relatedEntityType,
      related_entity_id: options.relatedEntityId,
    })

    return res.ok
  } catch (e) {
    console.error('[notifications] Discord send failed:', e)
    await logNotification({
      channel: 'discord',
      recipient,
      body: bodyPreview,
      status: 'failed',
      error_message: e instanceof Error ? e.message : 'Unknown error',
      related_entity_type: options.relatedEntityType,
      related_entity_id: options.relatedEntityId,
    })
    return false
  }
}

// ──────────────────────────────────────────────
// SMS (Twilio)
// ──────────────────────────────────────────────

interface SendSMSOptions {
  phones: (string | undefined)[]
  message: string
  /** For notification_log tracking */
  relatedEntityType?: string
  relatedEntityId?: string
}

/**
 * Send SMS via Twilio to one or more phone numbers. Fire-and-forget safe.
 * Logs each send attempt to notification_log table.
 */
export async function sendSMS(options: SendSMSOptions): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[notifications] Twilio not configured — skipping SMS')
    return false
  }

  const validPhones = options.phones.filter(Boolean) as string[]
  if (validPhones.length === 0) return false

  let allSuccess = true

  for (const phone of validPhones) {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: phone,
            Body: options.message,
          }),
        }
      )

      await logNotification({
        channel: 'sms',
        recipient: phone,
        body: options.message.slice(0, 500),
        status: res.ok ? 'sent' : 'failed',
        error_message: res.ok ? undefined : `HTTP ${res.status}`,
        related_entity_type: options.relatedEntityType,
        related_entity_id: options.relatedEntityId,
      })

      if (!res.ok) allSuccess = false
    } catch (e) {
      console.error('[notifications] SMS send failed:', e)
      await logNotification({
        channel: 'sms',
        recipient: phone,
        body: options.message.slice(0, 500),
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Unknown error',
        related_entity_type: options.relatedEntityType,
        related_entity_id: options.relatedEntityId,
      })
      allSuccess = false
    }
  }

  return allSuccess
}

// ──────────────────────────────────────────────
// Convenience: manager phones
// ──────────────────────────────────────────────

/** Returns Will + Greg phone numbers from env */
export function getManagerPhones(): string[] {
  return [process.env.WILL_PHONE, process.env.GREG_PHONE].filter(Boolean) as string[]
}

/** Returns Jose + Greg phone numbers from env (sales alerts) */
export function getSalesPhones(): string[] {
  return [process.env.JOSE_PHONE, process.env.GREG_PHONE].filter(Boolean) as string[]
}
