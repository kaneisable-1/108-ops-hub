'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LeadSearchResult {
  id: string
  contact_name: string | null
  contact_phone: string | null
  ghl_contact_id: string
}

export function useLeadSearch(query: string) {
  const [results, setResults] = useState<LeadSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const debounceRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const isPhone = /^\+?\d/.test(trimmed)

      const { data } = await supabase
        .from('leads')
        .select('id, contact_name, contact_phone, ghl_contact_id')
        .or(
          isPhone
            ? `contact_phone.eq.${trimmed},contact_phone.ilike.%${trimmed}%`
            : `contact_name.ilike.%${trimmed}%`
        )
        .order('created_at', { ascending: false })
        .limit(5)

      setResults(data || [])
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, supabase])

  return { results, loading }
}
