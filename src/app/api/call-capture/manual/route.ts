import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

// Search GHL for existing contact by phone
async function searchGHLContactByPhone(phone: string): Promise<{ id: string; name: string } | null> {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!apiKey || !locationId || !phone) return null

  try {
    const url = `${GHL_API_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}&limit=1`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    })

    if (res.ok) {
      const data = await res.json()
      const contact = data.contacts?.[0]
      if (contact) {
        return {
          id: contact.id,
          name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const fields = await request.json()

    // Validate required fields
    if (!fields.contact_name?.trim() || !fields.contact_phone?.trim()) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Search for existing GHL contact
    let existing_contact: { id: string; name: string } | null = null
    let ghl_contact_id = `manual_${Date.now()}`

    existing_contact = await searchGHLContactByPhone(fields.contact_phone)

    if (existing_contact) {
      ghl_contact_id = existing_contact.id
      console.log(`[manual] Found existing GHL contact: ${existing_contact.name} (${existing_contact.id})`)
    } else if (process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID) {
      // Create new GHL contact
      try {
        const nameParts = fields.contact_name.trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        const res = await fetch(`${GHL_API_BASE}/contacts/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GHL_API_KEY}`,
            Version: '2021-07-28',
          },
          body: JSON.stringify({
            locationId: process.env.GHL_LOCATION_ID,
            firstName,
            lastName,
            phone: fields.contact_phone,
            email: fields.contact_email || '',
            tags: ['108-lead-intel', 'manual-entry'],
            source: 'Call Capture - Manual',
          }),
        })

        if (res.ok) {
          const data = await res.json()
          ghl_contact_id = data.contact?.id || ghl_contact_id
        }
      } catch (err) {
        console.error('[manual] GHL contact creation failed:', err)
      }
    }

    // Save to Supabase — manual entries default to warm/follow_up
    const supabase = await createServiceRoleClient()
    const { data: insertedLead, error: dbError } = await supabase
      .from('leads')
      .insert({
        ghl_contact_id,
        contact_name: fields.contact_name.trim(),
        contact_phone: fields.contact_phone.trim(),
        contact_email: fields.contact_email?.trim() || null,
        athlete_name: fields.athlete_name?.trim() || null,
        athlete_age: fields.athlete_age ? parseInt(fields.athlete_age, 10) : null,
        athlete_position: fields.athlete_position?.trim() || null,
        athlete_level: fields.athlete_level || null,
        location: fields.location?.trim() || null,
        lead_temperature: 'warm',
        queue: 'follow_up',
        priority: 50,
        channel: 'text',
        tags: ['manual-entry'],
        status: 'new',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
    }

    return NextResponse.json({
      lead_id: insertedLead?.id || null,
      ghl_contact_id,
      existing_contact,
    })
  } catch (err) {
    console.error('Manual capture error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
