'use client'

import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { LeadQueue } from '@/types'

// ─── State ────────────────────────────────────────────────

interface DashboardState {
  sidebarOpen: boolean
  sidebarDrawerOpen: boolean
  activeTab: LeadQueue | 'all'
  searchQuery: string
  filters: {
    channel: string
    serviceMatch: string
    timeRange: 'today' | 'week' | 'month' | 'all'
  }
  filtersExpanded: boolean
  selectedLeadId: string | null
  detailPanelOpen: boolean
}

const initialState: DashboardState = {
  sidebarOpen: true,
  sidebarDrawerOpen: false,
  activeTab: 'all',
  searchQuery: '',
  filters: {
    channel: 'all',
    serviceMatch: 'all',
    timeRange: 'all',
  },
  filtersExpanded: false,
  selectedLeadId: null,
  detailPanelOpen: false,
}

// ─── Actions ──────────────────────────────────────────────

type Action =
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: LeadQueue | 'all' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTER'; payload: { key: keyof DashboardState['filters']; value: string } }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_FILTERS_EXPANDED'; payload: boolean }
  | { type: 'OPEN_DETAIL_PANEL'; payload: string }
  | { type: 'CLOSE_DETAIL_PANEL' }

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'SET_SIDEBAR_DRAWER_OPEN':
      return { ...state, sidebarDrawerOpen: action.payload }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, [action.payload.key]: action.payload.value },
      }
    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters }
    case 'SET_FILTERS_EXPANDED':
      return { ...state, filtersExpanded: action.payload }
    case 'OPEN_DETAIL_PANEL':
      return { ...state, selectedLeadId: action.payload, detailPanelOpen: true }
    case 'CLOSE_DETAIL_PANEL':
      return { ...state, detailPanelOpen: false, selectedLeadId: null }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────

interface DashboardContextValue {
  state: DashboardState
  dispatch: Dispatch<Action>
  // Convenience helpers
  toggleSidebar: () => void
  setSidebarDrawerOpen: (open: boolean) => void
  setActiveTab: (tab: LeadQueue | 'all') => void
  setSearchQuery: (query: string) => void
  setFilter: (key: keyof DashboardState['filters'], value: string) => void
  resetFilters: () => void
  setFiltersExpanded: (expanded: boolean) => void
  openDetailPanel: (leadId: string) => void
  closeDetailPanel: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value: DashboardContextValue = {
    state,
    dispatch,
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setSidebarDrawerOpen: (open) => dispatch({ type: 'SET_SIDEBAR_DRAWER_OPEN', payload: open }),
    setActiveTab: (tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setSearchQuery: (query) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }),
    setFilter: (key, value) => dispatch({ type: 'SET_FILTER', payload: { key, value } }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
    setFiltersExpanded: (expanded) => dispatch({ type: 'SET_FILTERS_EXPANDED', payload: expanded }),
    openDetailPanel: (leadId) => dispatch({ type: 'OPEN_DETAIL_PANEL', payload: leadId }),
    closeDetailPanel: () => dispatch({ type: 'CLOSE_DETAIL_PANEL' }),
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
