import { NextRequest, NextResponse } from 'next/server'
import { ingestLead } from '@/lib/leads/ingest'

export async function POST(request: NextRequest) {
  try {
    const fields = await request.json()

    if (!fields.contact_name?.trim() || !fields.contact_phone?.trim()) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    const result = await ingestLead({
      contact_name: fields.contact_name.trim(),
      contact_phone: fields.contact_phone.trim(),
      contact_email: fields.contact_email?.trim() || null,
      athlete_name: fields.athlete_name?.trim() || null,
      athlete_age: fields.athlete_age ? parseInt(fields.athlete_age, 10) : null,
      athlete_position: fields.athlete_position?.trim() || null,
      athlete_level: fields.athlete_level || null,
      location: fields.location?.trim() || null,
      channel: 'text',
      tags: ['manual-entry'],
      source: 'Call Capture - Manual',
    })

    return NextResponse.json({
      lead_id: result.lead_id,
      ghl_contact_id: result.ghl_contact_id,
      existing_contact: result.existing_contact,
    })
  } catch (err) {
    console.error('Manual capture error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
