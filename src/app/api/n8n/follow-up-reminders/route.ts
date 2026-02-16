import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateServiceKey } from '@/lib/auth/serviceKey'
import { sendDiscord, sendSMS } from '@/lib/notifications'

/**
 * POST /api/n8n/follow-up-reminders
 *
 * Queries leads where follow_up_date <= today and status is still active.
 * Sends Discord + SMS reminders to the claimed_by user.
 *
 * Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY | CRON_SECRET>
 */
export async function POST(request: Request) {
  const authError = validateServiceKey(request)
  if (authError) return authError

  try {
    const today = new Date().toISOString().split('T')[0]
    const supabase = await createServiceRoleClient()

    // Find leads with follow-up due
    const { data: leads, error: queryError } = await supabase
      .from('leads')
      .select('id, contact_name, athlete_name, claimed_by, follow_up_date, pipeline_stage')
      .lte('follow_up_date', today)
      .in('status', ['claimed', 'contacted'])
      .not('claimed_by', 'is', null)

    if (queryError) {
      console.error('[n8n/follow-up-reminders] Query error:', queryError)
      return NextResponse.json({ error: 'Failed to query leads' }, { status: 500 })
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, reminders_sent: 0, message: 'No follow-ups due' })
    }

    // Look up user names and phones for claimed_by users
    const claimedByIds = [...new Set(leads.map((l) => l.claimed_by).filter(Boolean))]
    const { data: users } = await supabase
      .from('users')
      .select('id, name, phone')
      .in('id', claimedByIds)

    const userMap = new Map(
      (users || []).map((u: { id: string; name: string; phone?: string }) => [u.id, u])
    )

    let remindersSent = 0

    for (const lead of leads) {
      const user = userMap.get(lead.claimed_by)
      const userName = user?.name || 'Team'
      const leadName = lead.athlete_name || lead.contact_name || 'Unknown'

      // Discord reminder
      await sendDiscord({
        content: `\u{23F0} **Follow-Up Reminder**`,
        embeds: [{
          title: leadName,
          color: 0x3b82f6,
          fields: [
            { name: 'Assigned To', value: userName, inline: true },
            { name: 'Follow-Up Date', value: lead.follow_up_date, inline: true },
            { name: 'Pipeline', value: lead.pipeline_stage || 'lead', inline: true },
          ],
          footer: { text: `Lead ID: ${lead.id}` },
          timestamp: new Date().toISOString(),
        }],
        recipientLabel: 'follow-up-reminders',
        relatedEntityType: 'lead',
        relatedEntityId: lead.id,
      })

      // SMS if user has a phone number
      if (user?.phone) {
        await sendSMS({
          phones: [user.phone],
          message: `\u{23F0} Follow-up reminder: ${leadName} (due ${lead.follow_up_date}). Open 108 Hub to take action.`,
          relatedEntityType: 'lead',
          relatedEntityId: lead.id,
        })
      }

      remindersSent++
    }

    return NextResponse.json({
      success: true,
      reminders_sent: remindersSent,
      leads: leads.map((l) => ({
        id: l.id,
        name: l.athlete_name || l.contact_name,
        follow_up_date: l.follow_up_date,
      })),
    })
  } catch (err) {
    console.error('[n8n/follow-up-reminders] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
