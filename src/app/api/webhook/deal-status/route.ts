import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const VALID_STATUSES = [
  'pending_confirmation',
  'confirmed',
  'contract_sent',
  'contract_signed',
  'payment_sent',
  'payment_complete',
  'scheduling',
  'complete',
  'expired',
  'canceled',
  'payment_failed',
  'delivery_failed',
  'ghl_failed',
] as const

// n8n calls this endpoint to update deal status as the deal
// progresses through GHL (contract sent, signed, payment, etc.)
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.DEAL_WEBHOOK_SECRET

    if (webhookSecret) {
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { deal_id, status, ghl_contact_id, ghl_contract_id, ghl_payment_id, experience_id } = body

    if (!deal_id || !status) {
      return NextResponse.json(
        { error: 'deal_id and status are required' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Build update payload — only include fields that are provided
    const updatePayload: Record<string, unknown> = { status }

    if (ghl_contact_id) updatePayload.ghl_contact_id = ghl_contact_id
    if (ghl_contract_id) updatePayload.ghl_contract_id = ghl_contract_id
    if (ghl_payment_id) updatePayload.ghl_payment_id = ghl_payment_id
    if (experience_id) updatePayload.experience_id = experience_id

    // Set confirmed_at timestamp when deal is confirmed
    if (status === 'confirmed') {
      updatePayload.confirmed_at = new Date().toISOString()
    }

    const { data: deal, error: updateError } = await supabase
      .from('deals')
      .update(updatePayload)
      .eq('id', deal_id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
      throw updateError
    }

    // Log activity on linked lead
    if (deal.lead_id) {
      await supabase.from('lead_activity').insert({
        lead_id: deal.lead_id,
        user_id: null,
        action: `deal status updated to ${status}`,
        details: { deal_id, status },
      })
    }

    return NextResponse.json({ deal })
  } catch (err) {
    console.error('[webhook/deal-status] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
