# GoHighLevel Configuration Guide

## 1. Pipeline Alignment

Create or update the GHL pipeline to match Ops Hub queues:

| GHL Pipeline Stage | Ops Hub Queue | Description |
|-------------------|---------------|-------------|
| Call Now | `call_now` | Hot leads, ready to book |
| Follow Up | `follow_up` | Warm leads, has questions |
| Nurture | `nurture` | Cold leads, early stage |
| Not a Fit | `not_a_fit` | Wrong sport, too far, not serious |
| Converted | `converted` | Booked a program |

## 2. Custom Fields

Add these custom fields to GHL contacts (Settings → Custom Fields):

| Field Key | Label | Type |
|-----------|-------|------|
| `108_pipeline_stage` | 108 Pipeline Stage | Text |
| `108_ai_summary` | AI Lead Summary | Text (Long) |
| `108_call_summary` | Last Call Summary | Text (Long) |

These fields are populated automatically by the Ops Hub AI pipeline.

## 3. Workflow: New Lead Notification

Create a GHL workflow (Automation → Workflows → Create):

**Trigger:** Contact Created
**Actions:**
1. Internal Notification → Push to Jose (all new contacts)
2. Send SMS → Jose's phone: "New lead: {{contact.name}} - {{contact.phone}}"
3. Custom Webhook → POST to Discord webhook URL with JSON body:
   ```json
   {
     "content": "📥 **New GHL Contact:** {{contact.name}} ({{contact.phone}}) — Source: {{contact.source}}"
   }
   ```

## 4. Workflow: Inbound Message Notification

**Trigger:** Customer Replied (any channel)
**Conditions:** Contact has NOT replied in last 30 minutes (prevent notification spam)
**Actions:**
1. Internal Notification → Push to Jose
2. Send SMS → Jose's phone: "Reply from {{contact.name}}: {{message.body}}"

## 5. Workflow: Forward to Ops Hub (via n8n)

**Trigger:** Contact Created OR Customer Replied
**Actions:**
1. Custom Webhook → POST to n8n webhook URL with contact data
   - n8n then transforms and forwards to `/api/webhook/ghl`
   - See `docs/setup/n8n-ghl-workflow.md` for n8n configuration

## 6. Mobile App Setup (Jose)

1. Install **LeadConnector** app (iOS/Android)
2. Log in with Jose's GHL credentials
3. Settings → Notifications → Enable ALL:
   - New contacts
   - Inbound messages
   - Missed calls
   - Form submissions
4. Test: Create a test contact in GHL → verify push notification on phone
5. If notifications are unreliable: also rely on SMS workflow (#3 above) as backup

## 7. Tags for AI Pipeline

The Ops Hub writes these tags to GHL contacts automatically:

| Tag | When Applied |
|-----|-------------|
| `108-lead-intel` | All leads created via Ops Hub |
| `temp-hot` / `temp-warm` / `temp-cold` | AI temperature classification |
| `108-converted` | Pipeline stage changed to converted |
| `108-nurture` | Pipeline stage changed to nurture |
| `108-app-accepted` | 108 Path application accepted |
| `108-app-rejected` | 108 Path application rejected |
| `manual-entry` | Lead entered manually via QuickCapture |
