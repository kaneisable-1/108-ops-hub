import { NextRequest, NextResponse } from 'next/server'
import { ingestLead } from '@/lib/leads/ingest'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const result = await ingestLead({
      text,
      channel: 'text',
      source: 'Call Capture',
    })

    return NextResponse.json({
      triage: result.triage,
      ghl_contact_id: result.ghl_contact_id,
      lead_id: result.lead_id,
      existing_contact: result.existing_contact,
    })
  } catch (err) {
    console.error('Call capture error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
