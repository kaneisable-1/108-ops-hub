# n8n GHL → Ops Hub Workflow Setup

## Overview

This n8n workflow forwards GoHighLevel contact events to the 108 Ops Hub webhook, enabling automatic lead ingestion with AI triage.

```
GHL Event → n8n Webhook Trigger → Transform → (Optional: Claude Triage) → HTTP POST to Ops Hub
```

## Workflow Nodes

### Node 1: GHL Webhook Trigger

- **Type:** Webhook
- **Method:** POST
- **Path:** `/ghl-to-108`
- **Authentication:** None (GHL sends its own signature)

Configure GHL to send webhooks to this n8n URL for these events:
- Contact Created
- Inbound Message
- Contact Tag Added

GHL webhook setup: Settings → Webhooks → Add Webhook → paste n8n webhook URL.

### Node 2: Transform

Map GHL's payload structure to what the Ops Hub webhook expects:

```javascript
// n8n Function Node
const ghl = $input.first().json;

return {
  json: {
    contact_id: ghl.contact_id || ghl.id,
    contact_name: [ghl.first_name || ghl.firstName, ghl.last_name || ghl.lastName]
      .filter(Boolean)
      .join(' '),
    contact_phone: ghl.phone,
    contact_email: ghl.email,
    message: ghl.body || ghl.message || '',
    channel: ghl.type || ghl.source || 'ghl',
  }
};
```

### Node 3 (Optional): Claude AI Triage

If you want n8n to pre-triage before sending to the webhook:

- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://api.anthropic.com/v1/messages`
- **Headers:**
  - `x-api-key`: `{{$env.ANTHROPIC_API_KEY}}`
  - `anthropic-version`: `2023-06-01`
  - `Content-Type`: `application/json`
- **Body:** See the triage prompt in `src/lib/leads/triage.ts`

Attach the Claude response as the `triage` field in the final payload.

If you skip this node, the Ops Hub webhook will run triage itself (slightly slower but simpler).

### Node 4: HTTP POST to Ops Hub

- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://{your-app-url}/api/webhook/ghl`
- **Headers:**
  - `Content-Type`: `application/json`
  - `x-ghl-signature`: HMAC-SHA256 signature (see below)
- **Body:** Output from Node 2 (+ optional `triage` from Node 3)

#### HMAC Signature

The webhook verifies requests using HMAC-SHA256. In n8n:

```javascript
// n8n Function Node (before HTTP Request)
const body = JSON.stringify($input.first().json);
const secret = $env.GHL_WEBHOOK_SECRET;
const encoder = new TextEncoder();
const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

return {
  json: $input.first().json,
  headers: {
    'x-ghl-signature': signature
  }
};
```

## Environment Variables (n8n)

Set these in n8n (Settings → Variables):

| Variable | Value |
|----------|-------|
| `GHL_WEBHOOK_SECRET` | Same value as Vercel env var |
| `ANTHROPIC_API_KEY` | Only if using Node 3 (Claude triage in n8n) |
| `OPS_HUB_URL` | Your app URL (e.g., `https://ops.108performance.com`) |

## Testing

1. Create a test contact in GHL with a known phone number
2. Watch n8n execution logs for the webhook trigger
3. Verify the transform output matches expected payload shape
4. Check Supabase `leads` table for the new lead
5. Check Discord and SMS for hot lead notifications (if AI triage classifies as hot)
