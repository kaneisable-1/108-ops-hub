'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Phone, ClipboardCheck, Calendar, PenLine, TrendingUp } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

interface ActivityItem {
  id: string
  lead_id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user_name?: string
  lead_name?: string
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  lead_created: <Phone className="h-3.5 w-3.5" />,
  lead_claimed: <Phone className="h-3.5 w-3.5" />,
  call_logged: <Phone className="h-3.5 w-3.5" />,
  application_submitted: <ClipboardCheck className="h-3.5 w-3.5" />,
  application_reviewed: <ClipboardCheck className="h-3.5 w-3.5" />,
  experience_booked: <Calendar className="h-3.5 w-3.5" />,
  experience_status_changed: <Calendar className="h-3.5 w-3.5" />,
  session_created: <PenLine className="h-3.5 w-3.5" />,
  stage_changed: <TrendingUp className="h-3.5 w-3.5" />,
}

function getActionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export default function NotificationBell() {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchActivities = useCallback(async () => {
    const { data } = await supabase
      .from('lead_activity')
      .select('id, lead_id, action, details, created_at, user:users(name), lead:leads!lead_id(athlete_name, contact_name)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      const items: ActivityItem[] = data.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        lead_id: item.lead_id as string,
        action: item.action as string,
        details: item.details as Record<string, unknown> | null,
        created_at: item.created_at as string,
        user_name: (item.user as { name: string } | null)?.name || undefined,
        lead_name: (() => {
          const lead = item.lead as { athlete_name: string | null; contact_name: string | null } | null
          return lead?.athlete_name || lead?.contact_name || undefined
        })(),
      }))

      setActivities(items)

      // Count unread
      const stored = localStorage.getItem('108_notifications_last_seen')
      setLastSeen(stored)
      if (stored) {
        const unseenCount = items.filter((a) => a.created_at > stored).length
        setUnreadCount(unseenCount)
      } else {
        setUnreadCount(items.length > 0 ? items.length : 0)
      }
    }
  }, [supabase])

  useEffect(() => {
    if (!user) return
    fetchActivities()

    // Subscribe to realtime
    const channel = supabase
      .channel(`notifications-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lead_activity' },
        () => {
          fetchActivities()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchActivities, supabase])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleOpen = () => {
    setOpen(!open)
    if (!open) {
      // Mark as seen
      const now = new Date().toISOString()
      localStorage.setItem('108_notifications_last_seen', now)
      setLastSeen(now)
      setUnreadCount(0)
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[420px] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 rounded-t-2xl">
            <h3 className="text-sm font-bold text-gray-900">Activity</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Activity list */}
          {activities.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activities.map((activity) => {
                const isUnread = lastSeen ? activity.created_at > lastSeen : true
                const icon = ACTION_ICONS[activity.action] || <Bell className="h-3.5 w-3.5" />

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-gray-50',
                      isUnread && 'bg-brand-50/30'
                    )}
                  >
                    <div className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5',
                      isUnread ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
                    )}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">{getActionLabel(activity.action)}</span>
                        {activity.lead_name && (
                          <span className="text-gray-500"> — {activity.lead_name}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {activity.user_name || 'System'} &middot; {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="flex items-start pt-2">
                        <div className="h-2 w-2 rounded-full bg-brand-500" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
