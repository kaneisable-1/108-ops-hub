# Phase 3: Session Notes + Coach Tools — Design

## Document Info
- **Date**: 2026-02-13
- **Author**: Claude (Opus 4.6) + Greg Wiggins
- **Status**: Approved
- **Depends on**: Phase 1 (Scheduling), Phase 2 (Applications)

---

## Problem

Coaches at 108 Performance currently log session notes in personal notes apps or the Bridge platform. There is no centralized, structured way to capture what happened during a training session. This creates gaps in athlete progress tracking, makes exit evaluations ad hoc, and prevents managers from seeing coaching patterns across the program.

Coaches have 10-15 minutes between athletes (sessions scheduled 1 hour apart). They need a fast capture method that doesn't slow them down, with an option for more detail when time allows.

## Solution: Integrated Note Entry on Schedule Page

Notes are captured directly from the coach's schedule view (CoachDayView / SlotDetail), not on a separate page. This keeps the workflow in context — the coach sees their schedule, taps a session, and logs notes right there.

A separate `/sessions` page exists as a **read-only history** for managers to review past session data across all coaches and athletes.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry point | Integrated into schedule (SlotDetail) | Coach is already looking at their schedule; zero navigation friction |
| Input modes | Quick mode + Extended mode | Quick for between-session speed; Extended when coach has time |
| Voice transcription | Browser Web Speech API | Free, no additional API costs, works on mobile Chrome/Safari |
| AI parsing | Claude API | Already in stack; parses raw text into structured fields |
| Sentiment rating | Green / Yellow / Red | Coach signals willingness to continue working with athlete |
| Exit evaluation | Auto-triggered on final session day | Assigned coach (who did intake) fills out structured eval |
| Sessions page | Read-only history for managers | Managers need cross-coach, cross-athlete visibility |

---

## 1. Coach Note Entry Flow

### Entry Point
When a coach taps a filled session slot in their schedule, the existing SlotDetail panel expands to include a **"Session Notes"** section below the slot info.

### Quick Mode (default)
Designed for the 30-second between-session window:

- **Voice button** — tap to record, tap again to stop. Browser Web Speech API transcribes in real-time. Raw transcript saved immediately.
- **Text field** — free-form textarea as fallback or supplement to voice.
- **Coach Sentiment** — three large tappable buttons:
  - **Green** — "No issues, would work with this athlete again"
  - **Yellow** — "Issues to discuss, but athlete can proceed"
  - **Red** — "No-go, would not work with this client"
  - All three require a **reason field** (textarea, required on save)
- **Save** — one tap, done. Timestamp + coach ID auto-captured.

AI parsing runs asynchronously after save — coach doesn't wait for it.

### Extended Mode
Toggle from Quick to Extended when the coach has more time:

- All Quick Mode fields, plus:
- **Drills performed** — multi-select from a predefined list (hitting drills, pitching drills) with "Other" free-text option
- **Key observations** — structured textarea
- **Cues given** — what coaching cues were used
- **Recommendations** — what to work on next session
- **Athlete effort rating** — 1-5 scale
- **Injury/limitation notes** — optional flag + description

### AI Parsing
After a note is saved (Quick or Extended), a background API call sends the raw text to Claude API to extract:
- Drills performed
- Key observations
- Coaching cues used
- Recommendations for next session
- Detected concerns or flags

Parsed results are stored alongside raw text. Coaches can review/edit parsed results later but aren't blocked by parsing.

---

## 2. Coach Sentiment Rating

A per-session indicator from the coach about their willingness to work with the athlete:

| Color | Label | Meaning | Action |
|-------|-------|---------|--------|
| Green | Good to go | No issues, positive session | None needed |
| Yellow | Needs discussion | Behavioral/attitude issues but athlete can continue | Flags for manager review |
| Red | No-go | Coach would not work with this client | Immediate manager notification (Discord + SMS) |

**Rules:**
- Reason is **required** for all three colors (even Green — encourages positive feedback capture)
- Yellow and Red trigger notifications to managers (Will, Greg)
- Red triggers immediate Discord webhook + SMS to Will and Greg
- Sentiment history is visible on the athlete's profile and in the Sessions history page
- Managers can filter sessions by sentiment in the Sessions page

---

## 3. Exit Evaluation

When an athlete's experience ends (final scheduled session day), the system automatically surfaces an **Exit Evaluation** form for the assigned coach.

### Who fills it out
The coach assigned to the athlete at intake. This is tracked via the `sessions.coach_id` field — the coach who conducted the majority of sessions.

### Exit Eval Fields
- **Overall progress rating** — 1-5 scale
- **Goals achieved** — checklist of initial intake goals with yes/no/partial
- **Skill improvements** — structured text per discipline (hitting, pitching)
- **Behavioral assessment** — coachability, effort, attitude
- **Recommendation** — re-enroll, graduate, not a fit, needs different program
- **Coach's final notes** — free-text summary
- **Would you work with this athlete again?** — Yes / With conditions / No (mirrors sentiment system)

### Trigger Logic
- System checks if today is the athlete's last scheduled session day
- If yes, after the session note is saved, the Exit Eval form appears as a second section
- Exit eval can also be manually triggered from the athlete's profile by coordinators

---

## 4. Sessions Page (Read-Only History)

Route: `/sessions`

A manager/coordinator view for reviewing all session notes across coaches and athletes.

### Features
- **Filter bar**: by coach, by athlete, by date range, by sentiment color
- **Session cards**: compact list showing date, coach name, athlete name, sentiment badge, AI-parsed summary preview
- **Detail expansion**: tap a card to see full notes, parsed fields, and sentiment reason
- **Export**: future consideration (not in Phase 3 MVP)

### Access
- Coaches see only their own sessions
- Coordinators and managers see all sessions
- Admins see everything

---

## 5. Data Changes

### New columns on `sessions` table
```sql
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS raw_notes TEXT,
  ADD COLUMN IF NOT EXISTS parsed_notes JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS note_mode TEXT DEFAULT 'quick' CHECK (note_mode IN ('quick', 'extended')),
  ADD COLUMN IF NOT EXISTS coach_sentiment TEXT CHECK (coach_sentiment IN ('green', 'yellow', 'red')),
  ADD COLUMN IF NOT EXISTS sentiment_reason TEXT,
  ADD COLUMN IF NOT EXISTS drills_performed TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_observations TEXT,
  ADD COLUMN IF NOT EXISTS cues_given TEXT,
  ADD COLUMN IF NOT EXISTS recommendations TEXT,
  ADD COLUMN IF NOT EXISTS athlete_effort_rating INTEGER CHECK (athlete_effort_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS injury_notes TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ai_parsed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_exit_eval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exit_eval JSONB DEFAULT '{}';
```

### Critical fix (from health audit)
```sql
ALTER TABLE public.daily_briefings
  ADD CONSTRAINT daily_briefings_coach_date_unique UNIQUE (coach_id, date);
```

### Indexes
```sql
CREATE INDEX idx_sessions_coach_sentiment ON sessions(coach_sentiment);
CREATE INDEX idx_sessions_lead_id ON sessions(lead_id);
CREATE INDEX idx_sessions_coach_id_date ON sessions(coach_id, date);
```

---

## 6. Components (8 new)

| Component | Location | Purpose |
|-----------|----------|---------|
| `SessionNoteForm` | `components/sessions/` | Quick/Extended mode toggle + all input fields |
| `VoiceRecorder` | `components/sessions/` | Web Speech API record button + real-time transcript |
| `SentimentPicker` | `components/sessions/` | Green/Yellow/Red buttons + reason field |
| `ExitEvalForm` | `components/sessions/` | Structured exit evaluation form |
| `SessionCard` | `components/sessions/` | Compact card for sessions list page |
| `SessionDetail` | `components/sessions/` | Expanded view of a single session's notes |
| `SessionFilters` | `components/sessions/` | Filter bar for coach/athlete/date/sentiment |
| `ParsedNotesDisplay` | `components/sessions/` | Renders AI-parsed structured data |

---

## 7. API Routes (4 new)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sessions/notes` | POST | Save session note (quick or extended) |
| `/api/sessions/notes` | GET | Fetch sessions with filters |
| `/api/sessions/parse` | POST | AI parse raw notes via Claude API |
| `/api/sessions/exit-eval` | POST | Save exit evaluation |

---

## 8. Hooks (2 new)

| Hook | Purpose |
|------|---------|
| `useSessions` | Fetch, filter, and manage session notes |
| `useVoiceRecorder` | Web Speech API lifecycle (start, stop, transcript state) |

---

## 9. Notifications

| Trigger | Channel | Recipients |
|---------|---------|------------|
| Red sentiment | Discord webhook + SMS | Will, Greg |
| Yellow sentiment | Discord webhook | Will, Greg |
| Exit eval submitted | Discord webhook | Will, Greg, assigned coordinator |

---

## 10. Integration with Existing Schedule

The SessionNoteForm is embedded inside the existing `SlotDetail` component (from Phase 1). When a slot is filled and the session time has passed (or is in progress), the note form appears below the slot details.

Flow:
1. Coach opens schedule → sees their day
2. Taps a completed/in-progress slot
3. SlotDetail slides up showing athlete info + session time
4. Below that: SessionNoteForm (Quick mode by default)
5. Coach records voice or types, picks sentiment, saves
6. If final session day: ExitEvalForm appears after note save
7. AI parsing happens in background
8. Manager can later view all notes on `/sessions` page
