import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/leads/sync-ghl-note
 *
 * Pushes a call outcome + notes to the GHL contact as a note.
 * Non-blocking — failure here should not break the UI.
 */
export async function POST(request: NextRequest) {
  try {
    const { ghl_contact_id, outcome, notes, timestamp } = await request.json()

    if (!ghl_contact_id || !outcome) {
      return NextResponse.json({ error: 'ghl_contact_id and outcome are required' }, { status: 400 })
    }

    // Skip if no GHL API key configured
    if (!process.env.GHL_API_KEY) {
      return NextResponse.json({ synced: false, reason: 'GHL API key not configured' })
    }

    // Skip manual/placeholder contact IDs
    if (ghl_contact_id.startsWith('manual_')) {
      return NextResponse.json({ synced: false, reason: 'Manual contact ID — no GHL contact to sync' })
    }

    // Format the note body
    const outcomeLabel = outcome.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    const noteBody = [
      `📞 Call Outcome: ${outcomeLabel}`,
      timestamp ? `🕐 ${new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}` : '',
      notes ? `\n📝 Notes:\n${notes}` : '',
      '\n— Logged via 108 Ops Hub',
    ]
      .filter(Boolean)
      .join('\n')

    // POST note to GHL contact
    const ghlRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}/notes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          Version: '2021-07-28',
        },
        body: JSON.stringify({ body: noteBody }),
      }
    )

    if (!ghlRes.ok) {
      const errText = await ghlRes.text()
      console.error('GHL note sync failed:', errText)
      return NextResponse.json({ synced: false, reason: 'GHL API error' })
    }

    return NextResponse.json({ synced: true })
  } catch (err) {
    console.error('GHL note sync error:', err)
    return NextResponse.json({ synced: false, reason: 'Internal error' })
  }
}
