import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { formatBriefingDiscord, type BriefingData } from '@/lib/briefings/format'
import { logNotification } from '@/lib/notificationLog'
import type { ScheduleSlotEnriched, CoachTier } from '@/types'

/**
 * POST /api/briefings/deliver
 *
 * Sends generated briefings via Resend email + Discord webhook.
 * Updates delivery status in daily_briefings table.
 *
 * Query param: ?date=YYYY-MM-DD (defaults to today)
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().split('T')[0]

    const supabase = await createServiceRoleClient()

    // 1. Fetch briefings for the date
    const { data: briefings, error: fetchError } = await supabase
      .from('daily_briefings')
      .select(`
        *,
        coach:users!coach_id(id, name, email, phone, coach_tier, notify_sms, notify_discord)
      `)
      .eq('date', targetDate)

    if (fetchError || !briefings || briefings.length === 0) {
      return NextResponse.json({
        message: 'No briefings to deliver. Run /api/briefings/generate first.',
        delivered: 0,
      })
    }

    // 2. Also fetch schedule slots for Discord formatting
    const { data: slots } = await supabase
      .from('v_coach_daily_schedule')
      .select('*')
      .eq('date', targetDate)
      .neq('status', 'canceled')

    const allSlots = (slots || []) as ScheduleSlotEnriched[]

    const deliveryResults: { coach: string; email: boolean; sms: boolean; discord: boolean }[] = []

    for (const briefing of briefings) {
      const coach = briefing.coach as Record<string, unknown> | null
      if (!coach) continue

      const coachName = coach.name as string
      const coachEmail = coach.email as string
      const coachPhone = coach.phone as string | null
      const coachTier = (coach.coach_tier as CoachTier) || 'J1'
      const notifySms = coach.notify_sms as boolean
      const notifyDiscord = coach.notify_discord as boolean

      const coachSlots = allSlots.filter((s) => s.coach_id === coach.id)

      let emailSent = false
      let smsSent = false
      let discordSent = false

      // 3a. Send via Resend email
      if (process.env.RESEND_API_KEY && coachEmail) {
        try {
          const content = briefing.briefing_content as Record<string, unknown>
          const html = (content?.html as string) || `<pre>${briefing.briefing_text}</pre>`

          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || '108 Ops <ops@108performance.com>',
              to: [coachEmail],
              subject: `Daily Briefing — ${targetDate}`,
              html,
            }),
          })

          emailSent = res.ok
          if (res.ok) {
            logNotification({
              channel: 'email',
              recipient: coachEmail,
              subject: `Daily Briefing — ${targetDate}`,
              body: briefing.briefing_text || 'Daily briefing',
              status: 'sent',
              related_entity_type: 'briefing',
              related_entity_id: briefing.id,
            })
          } else {
            const errText = await res.text()
            console.error(`Resend email failed for ${coachName}:`, errText)
            logNotification({
              channel: 'email',
              recipient: coachEmail,
              subject: `Daily Briefing — ${targetDate}`,
              body: briefing.briefing_text || 'Daily briefing',
              status: 'failed',
              error_message: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
              related_entity_type: 'briefing',
              related_entity_id: briefing.id,
            })
          }
        } catch (e) {
          console.error(`Email delivery failed for ${coachName}:`, e)
          logNotification({
            channel: 'email',
            recipient: coachEmail,
            subject: `Daily Briefing — ${targetDate}`,
            body: briefing.briefing_text || 'Daily briefing',
            status: 'failed',
            error_message: e instanceof Error ? e.message : 'Unknown error',
            related_entity_type: 'briefing',
            related_entity_id: briefing.id,
          })
        }
      }

      // 3b. Send via Discord webhook
      if (process.env.DISCORD_WEBHOOK_URL && notifyDiscord) {
        try {
          const briefingData: BriefingData = {
            coachName,
            coachTier,
            date: targetDate,
            morningSlots: coachSlots.filter((s) => s.time_block === 'morning'),
            afternoonSlots: coachSlots.filter((s) => s.time_block === 'afternoon'),
          }

          const discordPayload = formatBriefingDiscord(briefingData)

          const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload),
          })

          discordSent = res.ok
          if (res.ok) {
            logNotification({
              channel: 'discord',
              recipient: coachName,
              body: `Daily briefing for ${targetDate}`,
              status: 'sent',
              related_entity_type: 'briefing',
              related_entity_id: briefing.id,
            })
          } else {
            console.error(`Discord delivery failed for ${coachName}`)
            logNotification({
              channel: 'discord',
              recipient: coachName,
              body: `Daily briefing for ${targetDate}`,
              status: 'failed',
              error_message: `HTTP ${res.status}`,
              related_entity_type: 'briefing',
              related_entity_id: briefing.id,
            })
          }
        } catch (e) {
          console.error(`Discord delivery failed for ${coachName}:`, e)
          logNotification({
            channel: 'discord',
            recipient: coachName,
            body: `Daily briefing for ${targetDate}`,
            status: 'failed',
            error_message: e instanceof Error ? e.message : 'Unknown error',
            related_entity_type: 'briefing',
            related_entity_id: briefing.id,
          })
        }
      }

      // 3c. Send via Twilio SMS
      if (process.env.TWILIO_ACCOUNT_SID && notifySms && coachPhone) {
        try {
          // Build a concise SMS-friendly briefing
          const morningCount = coachSlots.filter((s) => s.time_block === 'morning').length
          const afternoonCount = coachSlots.filter((s) => s.time_block === 'afternoon').length
          const totalSlots = morningCount + afternoonCount
          const athleteNames = coachSlots
            .map((s) => s.athlete_name || s.contact_name || 'TBD')
            .join(', ')

          const smsBody = totalSlots > 0
            ? `108 Daily Briefing (${targetDate})\n${coachName}, you have ${totalSlots} sessions today:\nAM: ${morningCount} | PM: ${afternoonCount}\nAthletes: ${athleteNames.slice(0, 140)}\nOpen the app for full details.`
            : `108 Daily Briefing (${targetDate})\n${coachName}, no sessions today. Enjoy your day off!`

          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
              },
              body: new URLSearchParams({
                From: process.env.TWILIO_PHONE_NUMBER!,
                To: coachPhone,
                Body: smsBody,
              }),
            }
          )

          smsSent = res.ok
          if (res.ok) {
            logNotification({
              channel: 'sms',
              recipient: coachPhone,
              body: smsBody,
              status: 'sent',
              related_entity_type: 'briefing',
              related_entity_id: briefing.id,
            })
          } else {
            const errText = await res.text()
            console.error(`SMS delivery failed for ${coachName}:`, errText)
            logNotification({
              channel: 'sms',
              recipient: coachPhone,
              body: smsBody,
              status: 'failed',
              error_message: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
              related_entity_type: 'briefing',
              related_entity_id: briefing.id,
            })
          }
        } catch (e) {
          console.error(`SMS delivery failed for ${coachName}:`, e)
          logNotification({
            channel: 'sms',
            recipient: coachPhone || 'unknown',
            body: `Daily briefing for ${targetDate}`,
            status: 'failed',
            error_message: e instanceof Error ? e.message : 'Unknown error',
            related_entity_type: 'briefing',
            related_entity_id: briefing.id,
          })
        }
      }

      // 4. Update delivery status
      const deliveredVia: string[] = []
      if (emailSent) deliveredVia.push('email')
      if (smsSent) deliveredVia.push('sms')
      if (discordSent) deliveredVia.push('discord')

      if (deliveredVia.length > 0) {
        await supabase
          .from('daily_briefings')
          .update({
            delivered_via: deliveredVia,
            delivered_at: new Date().toISOString(),
          })
          .eq('id', briefing.id)
      }

      deliveryResults.push({
        coach: coachName,
        email: emailSent,
        sms: smsSent,
        discord: discordSent,
      })
    }

    return NextResponse.json({
      message: `Delivered briefings for ${targetDate}`,
      delivered: deliveryResults.length,
      results: deliveryResults,
    })
  } catch (err) {
    console.error('Briefing delivery error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
