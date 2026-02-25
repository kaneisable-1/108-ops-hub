import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import type { LeadTemperature, LeadQueue, CallOutcome, ServiceMatch } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d, h:mm a')
}

export function getTemperatureColor(temp: LeadTemperature): string {
  const colors: Record<LeadTemperature, string> = {
    hot: 'status-dot-danger',
    warm: 'status-dot-warning',
    cold: 'status-dot-neutral',
  }
  return colors[temp]
}

export function getTemperatureDotClass(temp: LeadTemperature): string {
  const classes: Record<LeadTemperature, string> = {
    hot: 'status-dot-danger',
    warm: 'status-dot-warning',
    cold: 'status-dot-neutral',
  }
  return classes[temp]
}

export function getTemperatureBadgeClass(temp: LeadTemperature): string {
  const classes: Record<LeadTemperature, string> = {
    hot: 'badge-danger',
    warm: 'badge-warning',
    cold: 'badge-neutral',
  }
  return classes[temp]
}

export function getQueueLabel(queue: LeadQueue): string {
  const labels: Record<LeadQueue, string> = {
    call_now: 'Call Now',
    follow_up: 'Follow Up',
    nurture: 'Nurture',
    not_a_fit: 'Not a Fit',
  }
  return labels[queue]
}

export function getQueueEmoji(queue: LeadQueue): string {
  const emojis: Record<LeadQueue, string> = {
    call_now: '🔥',
    follow_up: '📋',
    nurture: '🌱',
    not_a_fit: '❌',
  }
  return emojis[queue]
}

export function getCallOutcomeLabel(outcome: CallOutcome): string {
  const labels: Record<CallOutcome, string> = {
    booked: 'Booked',
    follow_up_scheduled: 'Follow-up Scheduled',
    not_interested: 'Not Interested',
    no_answer: 'No Answer',
    left_voicemail: 'Left Voicemail',
    wrong_number: 'Wrong Number',
    price_objection: 'Price Objection',
    needs_more_info: 'Needs More Info',
  }
  return labels[outcome]
}

export function getServiceLabel(service: ServiceMatch): string {
  const labels: Record<ServiceMatch, string> = {
    '108_experience': '108 Experience',
    tri_star: 'Tri Star',
    virtual: 'Virtual',
    virtual_pro: 'Virtual Pro',
    college_prep: 'College Prep',
    draft_prep: 'Draft Prep',
    pro_experience: 'Pro Experience',
    coaches_experience: 'Coaches Experience',
    coaches_mentorship: 'Coaches Mentorship',
    tour_experience: 'Tour Experience',
    powered_by_108: 'Powered by 108',
    partnership: 'Partnership',
    performance_institute: 'Performance Institute',
    unknown: 'Unknown',
  }
  return labels[service] || service
}

export function getGHLContactUrl(contactId: string, locationId: string): string {
  return `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${contactId}`
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}
