import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// PWA deal capture endpoint
// Staff submit a deal via the PWA form (secondary path to SMS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      staff_id,
      athlete_name,
      athlete_phone,
      athlete_email,
      athlete_level,
      athlete_age,
      sport,
      skill_focus,
      package: packageCode,
      billing_frequency,
      price_cents,
      preferred_start,
      preferred_schedule,
      notes,
      raw_transcript,
    } = body

    // Validate required fields
    if (!athlete_name || !packageCode || !price_cents) {
      return NextResponse.json(
        { error: 'athlete_name, package, and price_cents are required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()

    // Look up lead by phone if provided
    let lead_id: string | null = null
    if (athlete_phone) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('contact_phone', athlete_phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lead) {
        lead_id = lead.id
      }
    }

    // Insert the deal
    const { data: deal, error: insertError } = await supabase
      .from('deals')
      .insert({
        lead_id,
        staff_id: staff_id || null,
        athlete_name,
        athlete_phone: athlete_phone || null,
        athlete_email: athlete_email || null,
        athlete_level: athlete_level || null,
        athlete_age: athlete_age || null,
        sport: sport || 'baseball',
        skill_focus: skill_focus || null,
        package: packageCode,
        billing_frequency: billing_frequency || null,
        price_cents,
        status: 'pending_confirmation',
        preferred_start: preferred_start || null,
        preferred_schedule: preferred_schedule || null,
        notes: notes || null,
        raw_transcript: raw_transcript || null,
        ai_confidence: 1.0, // PWA captures are manual, so full confidence
        is_deal: true,
      })
      .select()
      .single()

    if (insertError) {
      // Handle dedup constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'An active deal already exists for this athlete and package' },
          { status: 409 }
        )
      }
      throw insertError
    }

    // Log activity if linked to a lead
    if (lead_id) {
      await supabase.from('lead_activity').insert({
        lead_id,
        user_id: staff_id || null,
        action: `created deal for ${packageCode}`,
        details: { deal_id: deal.id, price_cents },
      })
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (err) {
    console.error('[deals/capture] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
