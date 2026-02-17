import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

export async function PUT(request: NextRequest) {
  try {
    const { lead_id, ghl_contact_id, fields } = await request.json()

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
    }

    // Update Supabase lead
    const supabase = await createServiceRoleClient()
    const { error: dbError } = await supabase
      .from('leads')
      .update({
        contact_name: fields.contact_name || null,
        contact_phone: fields.contact_phone || null,
        contact_email: fields.contact_email || null,
        athlete_name: fields.athlete_name || null,
        athlete_age: fields.athlete_age ? parseInt(fields.athlete_age, 10) : null,
        athlete_position: fields.athlete_position || null,
        athlete_level: fields.athlete_level || null,
        location: fields.location || null,
      })
      .eq('id', lead_id)

    if (dbError) {
      console.error('Supabase update error:', dbError)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    // Also update GHL contact if we have a real contact ID
    if (ghl_contact_id && !ghl_contact_id.startsWith('manual_') && process.env.GHL_API_KEY) {
      try {
        const nameParts = (fields.contact_name || '').trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        await fetch(`${GHL_API_BASE}/contacts/${ghl_contact_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            Version: '2021-07-28',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            phone: fields.contact_phone || '',
            email: fields.contact_email || '',
          }),
        })
      } catch (err) {
        console.error('[update] GHL contact update failed:', err)
        // Non-blocking — Supabase update already succeeded
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Call capture update error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
