import { createServiceRoleClient } from '@/lib/supabase/server'
import { updateContactCustomField, addContactTag } from './client'

/**
 * Sync pipeline stage change to GHL.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function syncPipelineStage(leadId: string, stage: string): Promise<void> {
  try {
    if (!process.env.GHL_API_KEY) {
      console.warn('[ghl/sync] GHL_API_KEY not set — skipping pipeline sync')
      return
    }

    const supabase = await createServiceRoleClient()
    const { data: lead } = await supabase
      .from('leads')
      .select('ghl_contact_id')
      .eq('id', leadId)
      .single()

    if (!lead?.ghl_contact_id) {
      console.warn(`[ghl/sync] No ghl_contact_id for lead ${leadId}`)
      return
    }

    // Update custom field
    await updateContactCustomField(lead.ghl_contact_id, '108_pipeline_stage', stage)

    // Add stage-specific tags
    if (stage === 'converted') {
      await addContactTag(lead.ghl_contact_id, '108-converted')
    } else if (stage === 'nurture') {
      await addContactTag(lead.ghl_contact_id, '108-nurture')
    }

    console.log(`[ghl/sync] Pipeline stage synced: lead=${leadId} stage=${stage}`)
  } catch (e) {
    console.error(`[ghl/sync] syncPipelineStage failed for lead=${leadId}:`, e)
  }
}

/**
 * Sync application decision to GHL.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function syncApplicationDecision(
  leadId: string,
  decision: string
): Promise<void> {
  try {
    if (!process.env.GHL_API_KEY) {
      console.warn('[ghl/sync] GHL_API_KEY not set — skipping decision sync')
      return
    }

    const supabase = await createServiceRoleClient()
    const { data: lead } = await supabase
      .from('leads')
      .select('ghl_contact_id')
      .eq('id', leadId)
      .single()

    if (!lead?.ghl_contact_id) {
      console.warn(`[ghl/sync] No ghl_contact_id for lead ${leadId}`)
      return
    }

    // Update custom field
    await updateContactCustomField(lead.ghl_contact_id, '108_app_decision', decision)

    // Add decision tag
    const tagMap: Record<string, string> = {
      accepted: '108-app-accepted',
      rejected: '108-app-rejected',
      need_more_info: '108-app-pending',
    }

    const tag = tagMap[decision]
    if (tag) {
      await addContactTag(lead.ghl_contact_id, tag)
    }

    console.log(`[ghl/sync] Application decision synced: lead=${leadId} decision=${decision}`)
  } catch (e) {
    console.error(`[ghl/sync] syncApplicationDecision failed for lead=${leadId}:`, e)
  }
}
