import type { AITriageResult } from '@/types'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

export async function searchGHLContactByPhone(phone: string): Promise<{ id: string; name: string } | null> {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!apiKey || !locationId || !phone) return null

  try {
    const searchUrl = `${GHL_API_BASE}/contacts/search/duplicate`
    const res = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
      body: JSON.stringify({ locationId, phone }),
    })

    if (!res.ok) {
      const fallbackUrl = `${GHL_API_BASE}/contacts/?locationId=${locationId}&query=${encodeURIComponent(phone)}&limit=1`
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
        },
      })

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        const contact = fallbackData.contacts?.[0]
        if (contact) {
          return {
            id: contact.id,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
          }
        }
      }
      return null
    }

    const data = await res.json()
    const contact = data.contact
    if (contact) {
      return {
        id: contact.id,
        name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unknown',
      }
    }
    return null
  } catch (err) {
    console.error('[ghl/contacts] search failed:', err)
    return null
  }
}

interface CreateContactInput {
  name?: string | null
  phone?: string | null
  email?: string | null
  tags?: string[]
  source?: string
}

export async function createGHLContact(input: CreateContactInput): Promise<string> {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  const fallbackId = `manual_${Date.now()}`

  if (!apiKey || !locationId) return fallbackId

  try {
    const nameParts = (input.name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const res = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        locationId,
        firstName,
        lastName,
        phone: input.phone || '',
        email: input.email || '',
        tags: input.tags || ['108-lead-intel'],
        source: input.source || 'Ops Hub',
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return data.contact?.id || fallbackId
    }
    return fallbackId
  } catch (err) {
    console.error('[ghl/contacts] create failed:', err)
    return fallbackId
  }
}

export function createGHLContactFromTriage(triage: AITriageResult): Promise<string> {
  return createGHLContact({
    name: triage.extracted.contact_name,
    phone: triage.extracted.contact_phone,
    email: triage.extracted.contact_email,
    tags: ['108-lead-intel', `temp-${triage.classification.temperature}`],
    source: 'Call Capture',
  })
}
