// ============================================
// 108 Ops Hub — Core Types
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

  // Pipeline
  pipeline_stage: PipelineStage

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
  role: 'sales' | 'admin' | 'manager' | 'coordinator' | 'coach'
  ghl_user_id: string | null
  phone: string | null
  notify_sms: boolean
  notify_discord: boolean
  is_coach: boolean
  coach_tier: CoachTier | null
  disciplines: string[]
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
  channel?: LeadChannel | 'all'
  serviceMatch?: ServiceMatch | 'all'
}

// ============================================
// Ops Hub Types
// ============================================

export type UserRole = 'sales' | 'admin' | 'manager' | 'coordinator' | 'coach'

export type CoachTier = 'S1' | 'S2' | 'J1'

export interface Application {
  id: string
  lead_id: string
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'need_more_info'
  submitted_at: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  decision_reason?: string
  video_url?: string
  responses?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Experience {
  id: string
  lead_id: string
  application_id?: string
  start_date: string
  end_date: string
  skill_focus: 'hitting' | 'pitching' | 'two_way'
  duration_days?: number
  price_cents?: number
  payment_status: 'pending' | 'deposit_paid' | 'paid_full' | 'payment_plan'
  deposit_amount_cents?: number
  balance_due_cents?: number
  stripe_payment_id?: string
  status: 'booked' | 'arrived' | 'in_progress' | 'completed' | 'canceled'
  notes?: string
  created_at: string
  updated_at: string
}

export type TimeBlock = 'morning' | 'afternoon'
export type Skill = 'hitting' | 'pitching'

export interface ScheduleSlot {
  id: string
  experience_id: string
  lead_id: string
  coach_id?: string
  date: string
  time_block: TimeBlock
  skill: Skill
  day_number: number
  is_final_day: boolean
  status: 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'conflict'
  conflict_reason?: string
  override_reason?: string
  group_slot_id?: string
  created_at: string
  updated_at: string
}

export interface CoachAvailability {
  id: string
  coach_id: string
  date: string
  available: boolean
  reason?: string
  created_at: string
}

export interface Session {
  id: string
  schedule_slot_id?: string
  lead_id: string
  coach_id: string
  date: string
  skill: Skill
  duration_minutes?: number
  raw_notes?: string
  parsed_notes?: ParsedSessionNotes
  energy_level?: number
  focus_areas?: string[]
  cues_that_worked?: string[]
  is_exit_eval: boolean
  exit_eval?: Record<string, unknown>
  video_urls?: string[]
  performance_data?: Record<string, unknown>
  // Phase 3 additions
  note_mode?: NoteMode
  coach_sentiment?: CoachSentiment
  sentiment_reason?: string
  drills_performed?: string[]
  key_observations?: string
  cues_given?: string
  recommendations?: string
  athlete_effort_rating?: number
  injury_notes?: string
  voice_transcript?: string
  ai_parsed_at?: string
  created_at: string
  updated_at: string
}

export interface AthleteMetrics {
  id: string
  lead_id: string
  days_to_first_login?: number
  days_to_first_workout?: number
  activation_status?: string
  sessions_last_7_days: number
  sessions_last_30_days: number
  workouts_completed_lifetime: number
  avg_sessions_per_month?: number
  engagement_band: 'hot' | 'warm' | 'cold'
  is_retained_3_months?: boolean
  is_retained_6_months?: boolean
  is_retained_12_months?: boolean
  churn_date?: string
  churn_reason?: string
  churn_risk_score?: number
  last_computed_at: string
  created_at: string
}

export interface DailyBriefing {
  id: string
  coach_id: string
  date: string
  briefing_content?: Record<string, unknown>
  briefing_text?: string
  delivered_via?: string[]
  delivered_at?: string
  created_at: string
}

export type PipelineStage = 'lead' | 'applied' | 'accepted' | 'booked' | 'arrived' | 'completed' | 'converting' | 'converted' | 'nurture'
export type SubscriptionStatus = 'none' | 'rfd' | 'skills' | 'rfd_skills' | '108_path'
export type EngagementBand = 'hot' | 'warm' | 'cold'

// ============================================
// Scheduling Types
// ============================================

export interface CoachSummary {
  id: string
  name: string
  coach_tier: CoachTier
  disciplines: string[]
}

export interface SlotSuggestion {
  date: string
  day_number: number
  is_final_day: boolean
  blocks: BlockSuggestion[]
}

export interface BlockSuggestion {
  time_block: TimeBlock
  skill: Skill
  suggested_coach: CoachSuggestionScore | null
  alternatives: CoachSuggestionScore[]
  conflict: string | null
  slot_id?: string
}

export interface CoachSuggestionScore {
  id: string
  name: string
  tier: CoachTier
  score: number
}

export interface AssignmentRequest {
  schedule_slot_id: string
  coach_id: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Enriched schedule slot with joined data (from v_coach_daily_schedule view)
export interface ScheduleSlotEnriched extends ScheduleSlot {
  coach_name?: string
  coach_tier_display?: CoachTier
  athlete_name?: string
  contact_name?: string
  contact_phone?: string
  athlete_age?: number
  athlete_level?: string
  experience_start?: string
  experience_end?: string
  skill_focus?: string
  experience_status?: string
  duration_days?: number
}

// ============================================
// Phase 3: Session Notes Types
// ============================================

export type CoachSentiment = 'green' | 'yellow' | 'red'
export type NoteMode = 'quick' | 'extended'

export interface SessionNoteInput {
  schedule_slot_id: string
  lead_id: string
  coach_id: string
  date: string
  skill: Skill
  raw_notes?: string
  voice_transcript?: string
  note_mode: NoteMode
  coach_sentiment: CoachSentiment
  sentiment_reason: string
  drills_performed?: string[]
  key_observations?: string
  cues_given?: string
  recommendations?: string
  athlete_effort_rating?: number
  injury_notes?: string
}

export interface ExitEvalInput {
  session_id: string
  progress_rating: number
  goals_achieved: Record<string, 'yes' | 'no' | 'partial'>
  skill_improvements: Record<string, string>
  behavioral_assessment: string
  recommendation: 'reenroll' | 'graduate' | 'not_a_fit' | 'different_program'
  final_notes: string
  would_work_again: 'yes' | 'with_conditions' | 'no'
}

export interface SessionEnriched extends Session {
  coach_name?: string
  athlete_name?: string
  contact_name?: string
}

export interface ParsedSessionNotes {
  drills: string[]
  observations: string[]
  cues_that_worked: string[]
  recommendations: string[]
  concerns: string[]
}

export interface SessionFilters {
  coach_id?: string
  lead_id?: string
  sentiment?: CoachSentiment | 'all'
  date_from?: string
  date_to?: string
  search?: string
}

// ============================================
// Voice-to-Contract Pipeline Types
// ============================================

export type DealStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'contract_sent'
  | 'contract_signed'
  | 'payment_sent'
  | 'payment_complete'
  | 'scheduling'
  | 'complete'
  | 'expired'
  | 'canceled'
  | 'payment_failed'
  | 'delivery_failed'
  | 'ghl_failed'

export type BillingFrequency = 'monthly' | 'annual' | 'one_time' | 'custom'

export type PackageCategory = 'athlete' | 'coach' | 'academy' | 'other'

export interface Package {
  code: ServiceMatch
  display_name: string
  category: PackageCategory
  price_cents_monthly: number | null
  price_cents_annual: number | null
  price_cents_one_time: number | null
  duration_days: number | null
  requires_experience_scheduling: boolean
  requires_simple_booking: boolean
  requires_parent_signature_if_minor: boolean
  skill_focus_default: string | null
  ghl_workflow_id: string | null
  description: string | null
  active: boolean
  created_at: string
}

export interface Deal {
  id: string
  lead_id: string | null
  staff_id: string | null

  // Athlete info
  athlete_name: string
  athlete_phone: string | null
  athlete_email: string | null
  athlete_level: AthleteLevel | null
  athlete_age: number | null
  sport: string
  skill_focus: string | null

  // Package details
  package: ServiceMatch
  billing_frequency: BillingFrequency | null
  price_cents: number

  // Lifecycle
  status: DealStatus

  // Integration IDs
  ghl_contact_id: string | null
  ghl_contract_id: string | null
  ghl_payment_id: string | null

  // AI parsing metadata
  raw_transcript: string | null
  parsed_data: Record<string, unknown> | null
  ai_confidence: number | null
  is_deal: boolean

  // SMS conversation state
  sms_conversation_id: string | null
  confirmation_sent_at: string | null
  confirmed_at: string | null
  expires_at: string | null

  // Scheduling
  preferred_start: string | null
  preferred_schedule: string | null
  experience_id: string | null

  // Notes
  notes: string | null

  created_at: string
  updated_at: string

  // Joined fields
  staff_name?: string
  lead_name?: string
  package_display_name?: string
}

export interface DealFilters {
  status: DealStatus | 'all'
  staff_id?: string
  search: string
  dateRange: 'today' | 'week' | 'month' | 'all'
}
