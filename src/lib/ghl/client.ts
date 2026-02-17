/**
 * GoHighLevel API v2 wrapper.
 *
 * Uses GHL_API_KEY + GHL_LOCATION_ID from environment.
 * All methods are fire-and-forget safe (errors logged, never throw).
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

function getHeaders(): Record<string, string> {
  const apiKey = process.env.GHL_API_KEY
  if (!apiKey) throw new Error('GHL_API_KEY not configured')

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28',
  }
}

function getLocationId(): string {
  const locationId = process.env.GHL_LOCATION_ID
  if (!locationId) throw new Error('GHL_LOCATION_ID not configured')
  return locationId
}

/**
 * Update a custom field on a GHL contact.
 */
export async function updateContactCustomField(
  ghlContactId: string,
  fieldKey: string,
  value: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${GHL_API_BASE}/contacts/${ghlContactId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          customFields: [{ key: fieldKey, value }],
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`[ghl/client] updateCustomField failed (${res.status}):`, text)
      return false
    }

    return true
  } catch (e) {
    console.error('[ghl/client] updateCustomField error:', e)
    return false
  }
}

/**
 * Add a tag to a GHL contact.
 */
export async function addContactTag(
  ghlContactId: string,
  tag: string
): Promise<boolean> {
  try {
    // First fetch current tags
    const getRes = await fetch(
      `${GHL_API_BASE}/contacts/${ghlContactId}`,
      { headers: getHeaders() }
    )

    if (!getRes.ok) {
      console.error(`[ghl/client] getContact failed (${getRes.status})`)
      return false
    }

    const contact = await getRes.json()
    const currentTags: string[] = contact.contact?.tags || []

    if (currentTags.includes(tag)) return true // already has tag

    // Update with new tag added
    const res = await fetch(
      `${GHL_API_BASE}/contacts/${ghlContactId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          tags: [...currentTags, tag],
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`[ghl/client] addTag failed (${res.status}):`, text)
      return false
    }

    return true
  } catch (e) {
    console.error('[ghl/client] addTag error:', e)
    return false
  }
}

/**
 * Remove a tag from a GHL contact.
 */
export async function removeContactTag(
  ghlContactId: string,
  tag: string
): Promise<boolean> {
  try {
    const getRes = await fetch(
      `${GHL_API_BASE}/contacts/${ghlContactId}`,
      { headers: getHeaders() }
    )

    if (!getRes.ok) return false

    const contact = await getRes.json()
    const currentTags: string[] = contact.contact?.tags || []
    const updatedTags = currentTags.filter((t) => t !== tag)

    if (updatedTags.length === currentTags.length) return true // tag wasn't present

    const res = await fetch(
      `${GHL_API_BASE}/contacts/${ghlContactId}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ tags: updatedTags }),
      }
    )

    return res.ok
  } catch (e) {
    console.error('[ghl/client] removeTag error:', e)
    return false
  }
}

// Re-export for convenience
export { getLocationId }
