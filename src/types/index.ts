// ============================================
// 108 Lead Intelligence System — Core Types
// ============================================

export type LeadTemperature = 'hot' | 'warm' | 'cold'
export type FitScore = 'good_fit' | 'maybe' | 'not_a_fit'
export type LeadIntent = 'ready_to_book' | 'has_questions' | 'just_browsing' | 'price_shopping'
export type LeadQueue = 'call_now' | 'follow_up' | 'nurture' | 'not_a_fit'
export type LeadStatus = 'new' | 'claimed' | 'contacted' | 'converted' | 'lost'
export type AthleteLevel = 'youth' | 'middle_school' | 'high_school' | 'college' | 'pro'
export type LeadChannel = 'web_form' | 'facebook' | 'instagram' | 'google' | 'phone' | 'referral' | 'walk_in' | 'email' | 'text' | 'other'

export type ServiceMatch =
  | '108_experience'
  | 'tri_star'
  | 'virtual'
  | 'virtual_pro'
  | 'college_prep'
  | 'draft_prep'
  | 'pro_experience'
  | 'coaches_experience'
  | 'coaches_mentorship'
  | 'tour_experience'
  | 'powered_by_108'
  | 'partnership'
  | 'performance_institute'
  | 'unknown'

export interface Lead {
  id: string
  ghl_contact_id: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null

  // Athlete info
  athlete_name: string | null
  athlete_age: number | null
  athlete_position: string | null
  athlete_level: AthleteLevel | null
  athlete_velocity: string | null
  athlete_school_team: string | null

  // Location
  location: string | null
  distance_hours: number | null

  // AI Classification
  lead_temperature: LeadTemperature
  fit_score: FitScore | null
  service_match: ServiceMatch | null
  intent: LeadIntent | null

  // Queue & Routing
  queue: LeadQueue
  priority: number
  ai_summary: string | null
  original_message: string | null
  suggested_response: string | null
  channel: LeadChannel | null
  tags: string[]

  // Status
  status: LeadStatus
  claimed_by: string | null
  claimed_at: string | null
  claimed_by_name?: string

  // Call tracking
  call_outcome: CallOutcome | null
  call_notes: string | null
  call_duration: number | null
  follow_up_date: string | null

  // Timestamps
  inbound_at: string | null
  created_at: string
  updated_at: string
}

export type CallOutcome =
  | 'booked'
  | 'follow_up_scheduled'
  | 'not_interested'
  | 'no_answer'
  | 'left_voicemail'
  | 'wrong_number'
  | 'price_objection'
  | 'needs_more_info'

export interface User {
  id: string
  email: string
  name: string
  role: 'sales' | 'admin' | 'manager' | 'coordinator'
  ghl_user_id: string | null
  phone: string | null
  notify_sms: boolean
  notify_discord: boolean
  created_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user_name?: string
}

// AI Triage Response from Claude
export interface AITriageResult {
  extracted: {
    contact_name: string | null
    contact_phone: string | null
    contact_email: string | null
    athlete_name: string | null
    athlete_age: number | null
    athlete_position: string | null
    athlete_level: AthleteLevel | null
    location: string | null
  }
  classification: {
    temperature: LeadTemperature
    fit_score: FitScore
    service_match: ServiceMatch
    intent: LeadIntent
  }
  routing: {
    queue: LeadQueue
    priority: number
    reason: string
  }
  content: {
    summary: string
    suggested_response: string
    objections: string[]
    questions: string[]
  }
  tags: string[]
}

// Post-Call Analysis from Claude
export interface PostCallAnalysis {
  summary: string
  athlete_details: {
    name: string | null
    age: number | null
    position: string | null
    velocity: string | null
    school_team: string | null
    level: AthleteLevel | null
  }
  service_interest: {
    primary: ServiceMatch | null
    duration: string | null
    skills: string[]
  }
  pricing: {
    discussed: boolean
    amount: string | null
    payment_concern: boolean
    payment_plan: boolean
  }
  objections: string[]
  action_items: string[]
  lead_temperature: LeadTemperature
  next_step: string | null
  follow_up_date: string | null
  referral_source: string | null
  call_outcome: CallOutcome
}

// Notification payload
export interface NotificationPayload {
  type: 'new_lead' | 'hot_lead' | 'lead_claimed' | 'call_completed'
  lead: Lead
  user?: User
  message: string
}

// GHL Contact (subset of fields we use)
export interface GHLContact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  tags: string[]
  customField: Record<string, string>
}

// Dashboard filter state
export interface DashboardFilters {
  queue: LeadQueue | 'all'
  temperature: LeadTemperature | 'all'
  status: LeadStatus | 'all'
  search: string
  dateRange: 'today' | 'week' | 'month' | 'all'
}
