# Comprehensive Execution Plan: Phase 3 + UI Sidebar Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Phase 3 (Session Notes + Coach Tools) then migrate the entire app from mobile-first bottom-nav layout to a ChatGPT-style collapsible sidebar layout.

**Architecture:** Two sequential milestones. Phase 3 adds session note functionality (14 new files) without changing layout. The UI migration then replaces the layout system across all pages (5 new files, 8 modifications, 4 deletions).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase, Claude API, Web Speech API, lucide-react

---

## Execution Order Rationale

Phase 3 runs **first** because:
1. It adds files without touching layout — zero conflict risk
2. The UI migration wraps every page in DashboardLayout — doing it first would force double-edits on sessions page
3. If sidebar breaks something, it doesn't block feature work
4. Phase 3 sessions page replaces a stub — migration should wrap the final version

---

## MILESTONE 1: Phase 3 — Session Notes + Coach Tools (Tasks 1-10)

See `docs/plans/2026-02-13-phase3-implementation-plan.md` for full task details with complete code.

| Task | Description | Files | Commit |
|------|-------------|-------|--------|
| 1 | Database migration 005 | `supabase/migrations/005_add_session_notes_columns.sql` | `feat(db): add Phase 3 session notes columns` |
| 2 | Update TypeScript types | `src/types/index.ts`, `src/types/speech.d.ts` | `feat(types): add Phase 3 session notes types` |
| 3 | Voice recorder hook | `src/hooks/useVoiceRecorder.ts` | `feat: add useVoiceRecorder hook` |
| 4 | API routes (notes, parse, exit-eval) | `src/app/api/sessions/notes/route.ts`, `parse/route.ts`, `exit-eval/route.ts` | `feat(api): add session notes routes` |
| 5 | Sessions hook | `src/hooks/useSessions.ts` | `feat: add useSessions hook` |
| 6 | Note entry components | `VoiceRecorder.tsx`, `SentimentPicker.tsx`, `SessionNoteForm.tsx`, `ExitEvalForm.tsx` | `feat: add session note components` |
| 7 | SlotDetail integration | `src/components/schedule/SlotDetail.tsx` (modify) | `feat: embed notes in SlotDetail` |
| 8 | History page components | `SessionCard.tsx`, `SessionFilters.tsx`, `ParsedNotesDisplay.tsx` | `feat: add sessions history components` |
| 9 | Sessions history page | `src/app/sessions/page.tsx` (rewrite) | `feat: build sessions history page` |
| 10 | Full build + push | Verify `npm run build` passes | Push to origin/master |

**Checkpoint:** After Task 10, run `npm run build`. Must pass with 0 errors. Push. **User must run migration 005 in Supabase SQL Editor.**

---

## MILESTONE 2: UI Sidebar Migration (Tasks 11-27)

### Phase A — Additive (Tasks 11-16): Create new components, nothing breaks

#### Task 11: DashboardContext

**Create:** `src/contexts/DashboardContext.tsx`

React Context + useReducer providing shared UI state.

State shape:
```typescript
interface DashboardState {
  sidebarOpen: boolean          // desktop expanded/collapsed
  sidebarDrawerOpen: boolean    // mobile overlay drawer
  activeTab: LeadQueue | 'all'
  searchQuery: string
  filters: {
    channel: LeadChannel | 'all'
    serviceMatch: ServiceMatch | 'all'
    timeRange: 'all' | 'today' | 'week' | 'month'
  }
  filtersExpanded: boolean
  selectedLeadId: string | null
  detailPanelOpen: boolean
}
```

Exports: `DashboardProvider`, `useDashboard()`

**Commit:** `feat: add DashboardContext for sidebar UI state`

---

#### Task 12: Sidebar Component

**Create:** `src/components/Sidebar.tsx`

Collapsible left sidebar (260px expanded / 64px collapsed). Absorbs Header, QueueTabs, and Navigation functionality.

Contents (top to bottom):
- Logo: "108 OPS HUB" (expanded) / "108" (collapsed)
- Nav links — ported from Navigation.tsx with role-based filtering. Uses lucide-react icons (Phone, ClipboardCheck, Calendar, FileText, BarChart3, Settings) instead of inline SVGs. Items: Leads (/), Applications (/applications), Schedule (/schedule), Sessions (/sessions), Analytics (/analytics), Admin (/admin). Active state via `usePathname()`.
- Queue pills — Call Now (red), Today (amber), Nurture (blue), All (gray) with live counts. Only visible when pathname === '/' (leads page).
- Collapsible filters — Channel, Service Match, Time Range `<select>` dropdowns. Uses LeadChannel and ServiceMatch types.
- User section — Avatar initials + name + role from `useUser()`, sign out button
- Collapse toggle — hidden on mobile, visible on md+

Responsive behavior:
- Desktop (md+): `fixed left-0 top-0 h-screen`, transitions width between 260px and 64px
- Mobile: Overlay drawer when `sidebarDrawerOpen=true`, backdrop `bg-black/60`, `z-50`, `animate-slide-in-left`

Props: `queueCounts?: Record<LeadQueue | 'all', number>`

**Commit:** `feat: add collapsible Sidebar component`

---

#### Task 13: SearchBar Component

**Create:** `src/components/SearchBar.tsx`

Floating bottom-center search input.
- Position: `fixed bottom-6 z-30`, centered `mx-auto max-w-2xl`
- Left offset adjusts with sidebar: `md:left-[260px]` (expanded) / `md:left-16` (collapsed)
- Styling: `bg-white/90 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-lg`
- Reads/writes `searchQuery` from `useDashboard()`
- Icons: Search, X from lucide-react

**Commit:** `feat: add floating SearchBar component`

---

#### Task 14: DashboardLayout Component

**Create:** `src/components/DashboardLayout.tsx`

Shared wrapper for all authenticated pages.

```tsx
<div className="min-h-screen bg-gray-50">
  <Sidebar queueCounts={queueCounts} />
  <main className={cn(
    "min-h-screen transition-[margin-left] duration-200",
    sidebarOpen ? "md:ml-[260px]" : "md:ml-16"
  )}>
    <MobileMenuButton />  {/* fixed top-4 left-4 z-40 md:hidden */}
    {children}
  </main>
</div>
```

Props: `children`, `queueCounts?` (optional — only leads page passes counts)

**Commit:** `feat: add DashboardLayout wrapper`

---

#### Task 15: LeadDetailPanel Component

**Create:** `src/components/LeadDetailPanel.tsx`

Right-slide panel replacing the bottom-sheet `LeadDetail.tsx`.
- Always rendered, controlled by `translate-x-0` / `translate-x-full`
- Position: `fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[480px] z-50`
- Backdrop: `fixed inset-0 bg-black/40 z-40` with opacity transition
- Same internal content as existing `LeadDetail.tsx` — just changes the outer shell from bottom-sheet to right-slide
- Remove: `mt-16`, `rounded-t-3xl`, drag handle bar
- Add: `border-l border-gray-200`, close button top-right

Props: Same as current LeadDetail

**Commit:** `feat: add LeadDetailPanel (right-slide)`

---

#### Task 16: CSS Animations

**Modify:** `src/app/globals.css`

Add at end:

```css
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.animate-slide-in-left {
  animation: slide-in-left 200ms ease-out;
}
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

**Commit:** `feat: add sidebar animation utilities`

---

### Phase B — Switchover (Tasks 17-23): Modify existing pages

#### Task 17: Modify layout.tsx

**Modify:** `src/app/layout.tsx`

Changes:
- Add `DashboardProvider` wrapping `{children}`
- Remove `<Navigation userRole="admin" />`
- Remove `<div className="pb-16">` wrapper (was for bottom nav spacing)
- Keep: html, head, body, Inter font, metadata, viewport

**Commit:** `feat: switch layout to DashboardProvider, remove bottom nav`

---

#### Task 18: Modify page.tsx (leads dashboard — largest change)

**Modify:** `src/app/page.tsx`

Changes:
- Remove: `<Header>`, `<QueueTabs>` renders and imports
- Remove: local state for `activeTab`, `searchQuery`, `showMenu`
- Add: `useDashboard()` for `activeTab`, `searchQuery`, `filters`
- Wrap authenticated content in `<DashboardLayout queueCounts={queueCounts}>`
- Add `<SearchBar />` inside the layout
- Replace `<LeadDetail>` with `<LeadDetailPanel>` (right-slide)
- Keep: `<CallCapture>` as-is (bottom-sheet modal — wizard, not persistent)
- Add: Call Capture FAB button (floating action, bottom-right) replacing Header's phone button
- Remove: `paddingTop: calc(...)` inline style
- Add: `pb-24` for search bar clearance

**Commit:** `feat: refactor leads page to sidebar layout`

---

#### Task 19: Modify applications/page.tsx

**Modify:** `src/app/applications/page.tsx`

Changes:
- Wrap content in `<DashboardLayout>`
- Remove inline header div if present

**Commit:** `feat: wrap applications page in DashboardLayout`

---

#### Task 20: Modify schedule/page.tsx

**Modify:** `src/app/schedule/page.tsx`

Changes:
- Wrap `ScheduleContent` return in `<DashboardLayout>`

**Commit:** `feat: wrap schedule page in DashboardLayout`

---

#### Task 21: Modify sessions/page.tsx

**Modify:** `src/app/sessions/page.tsx`

Changes:
- Wrap `SessionsContent` return in `<DashboardLayout>` (this is now the Phase 3 full page, not the stub)
- Remove the sticky header inside sessions page (sidebar handles nav)

**Commit:** `feat: wrap sessions page in DashboardLayout`

---

#### Task 22: Modify analytics/page.tsx

**Modify:** `src/app/analytics/page.tsx`

Changes:
- Wrap content in `<DashboardLayout>`

**Commit:** `feat: wrap analytics page in DashboardLayout`

---

#### Task 23: Modify admin/page.tsx

**Modify:** `src/app/admin/page.tsx`

Changes:
- Wrap content in `<DashboardLayout>`

**Commit:** `feat: wrap admin page in DashboardLayout`

---

### Phase C — Cleanup (Tasks 24-27): Delete replaced files

#### Task 24: Delete Header.tsx

**Delete:** `src/components/Header.tsx`

Functionality absorbed into Sidebar (logo, greeting, call capture button → FAB) and SearchBar (search).

#### Task 25: Delete QueueTabs.tsx

**Delete:** `src/components/QueueTabs.tsx`

Functionality absorbed into Sidebar queue pills.

#### Task 26: Delete Navigation.tsx

**Delete:** `src/components/layout/Navigation.tsx`

Functionality absorbed into Sidebar nav links.

#### Task 27: Delete LeadDetail.tsx

**Delete:** `src/components/LeadDetail.tsx`

Replaced by `LeadDetailPanel.tsx` (right-slide version).

**Commit (all 4 deletions):** `refactor: remove old layout components replaced by sidebar`

---

### Phase D — Verification (Task 28)

#### Task 28: Full Build + Test

```bash
cd /Users/gregoriowiggles/Development/108-lead-intel && npm run build
```

Expected: 0 errors, ~20 routes compiled.

Manual test checklist:
- [ ] Desktop: sidebar expand/collapse, nav links, queue pills, filters, search bar, lead detail right-slide
- [ ] Mobile: hamburger → drawer, backdrop close, full-width detail panel
- [ ] Auth: login page has no sidebar, sign out works from sidebar
- [ ] Schedule page: note form still works inside SlotDetail
- [ ] Sessions page: filters + card list works

**Commit + Push:**
```bash
git push origin master
```

---

## Summary

| Milestone | Tasks | New Files | Modified | Deleted | Estimated Time |
|-----------|-------|-----------|----------|---------|----------------|
| Phase 3: Session Notes | 1-10 | 14 | 2 | 0 | 60-90 min |
| UI Migration | 11-28 | 5 | 8 | 4 | 60-90 min |
| **Total** | **28** | **19** | **10** | **4** | **2-3 hours** |

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Execution order | Phase 3 first, UI second | Avoids double-editing sessions page; layout changes don't block features |
| State management | React Context + useReducer | No new deps, crosses component tree |
| Icons | lucide-react | Already in package.json, replaces inline SVGs |
| Call Capture | Keep as bottom-sheet modal | It's a wizard, not persistent |
| Call Capture trigger | FAB button on leads page | Header is being removed |
| Queue pills on non-leads pages | Hidden | They only apply to leads view |
| Login page | No sidebar | Check `!user` before DashboardLayout |
