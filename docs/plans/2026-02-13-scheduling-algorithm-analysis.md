# 108 Ops Hub — Scheduling Algorithm Analysis

## 1. Problem Statement

Assign coaches to athletes across multi-day 108 Experiences, respecting tier rules, group size limits, skill constraints, pro protocols, and day-sequence logic. The system must:
- Auto-suggest optimal assignments when ops books a new Experience
- Detect and flag conflicts before they happen
- Allow manual override for edge cases
- Scale to peak capacity scenarios

---

## 2. Constraint Catalog

### 2.1 Coach Tier Hierarchy

```
S1 (Senior): Eugene, Nate, Mac, Will, Jose  — 5 coaches
S2:          Jacob, Tyler                    — 2 coaches
J1 (Junior): Nick, Bodie, Adam, Casey       — 4 coaches
                                      Total: 11 coaches
```

Each coach has disciplines: `hitting`, `pitching`, or `both`. For now, PRD says all coaches do both.

### 2.2 Day Assignment Rules (Hard Constraints)

These MUST be satisfied. A violation means an invalid schedule.

| Rule ID | Rule | Formal Expression |
|---------|------|-------------------|
| R1 | Day 1 for PRO/COLLEGE/HIGH_LEVEL_HS requires S1 or S2 | `IF athlete.level IN {pro, college, high_level_hs} AND slot.day_number == 1 THEN coach.tier IN {S1, S2}` |
| R2 | Day 2+ tier ceiling: can't escalate above Day 1 tier | `IF day1_tier == S1 THEN allowed = {S1, S2, J1}` / `IF day1_tier == S2 THEN allowed = {S2, J1}` / `IF day1_tier == J1 THEN allowed = {J1}` |
| R3 | Final day: PREFER S1/S2 for exit evaluation | Soft preference, not hard constraint |
| R4 | Pro athletes: S1 required on Day 1 AND Final Day | `IF athlete.level == pro THEN day1.coach.tier == S1 AND final_day.coach.tier == S1` |
| R5 | Pro athletes: solo OR paired with college+ only | `IF slot has pro athlete THEN slot.athletes.count <= 2 AND all_athletes.level IN {pro, college}` |
| R6 | Under 12: single skill only (no two-way) | `IF athlete.age < 12 THEN skill_focus != 'two_way'` |

### 2.3 Group Size Rules (Hard Constraints)

| Rule ID | Rule |
|---------|------|
| G1 | Standard: max 3 athletes per coach per time block |
| G2 | Pro: solo session, or paired with college+ caliber only (max 2) |

### 2.4 Time Block Structure (Hard Constraints)

| Rule ID | Rule |
|---------|------|
| T1 | Two-way athletes: Morning = Pitching (4h), Afternoon = Hitting (4h) |
| T2 | Single-skill athletes: one time block per day |
| T3 | A coach can only be in one slot per time block |

### 2.5 Soft Preferences (Optimization Goals)

These are desirable but not mandatory:

| Pref ID | Preference | Weight |
|---------|-----------|--------|
| P1 | Final day coach should be S1/S2 for exit eval | High |
| P2 | Coach continuity: same coach across days when possible | Medium |
| P3 | Balanced load: distribute athletes evenly across available coaches | Low |
| P4 | Skill match: assign coaches to their stronger discipline when possible | Low |

---

## 3. Algorithmic Approach

### 3.1 Why NOT use a generic constraint solver

Tempting to reach for OR-Tools, OptaPlanner, or a CSP solver. But:
- The problem is small (11 coaches, typically 3-8 athletes on any given day)
- The constraint set is well-defined and finite
- Ops staff need to understand WHY a suggestion was made (explainability)
- Generic solvers are opaque and hard to debug
- Adding/changing rules in a solver requires solver expertise

**Decision: Rule-based greedy algorithm with conflict detection.**

This is the right tradeoff for 108's scale. If they ever have 50+ coaches and 100+ daily athletes, revisit with a solver.

### 3.2 Algorithm: Auto-Suggest Assignment

When ops creates a new Experience (athlete + dates + skill_focus), the system suggests coach assignments for each day:

```
FUNCTION suggest_assignments(experience):
  athlete = experience.athlete
  dates = experience.date_range()
  skill_focus = experience.skill_focus  // hitting, pitching, two_way

  assignments = []

  FOR each date IN dates:
    day_number = date.index + 1
    is_first_day = (day_number == 1)
    is_final_day = (day_number == dates.length)

    IF skill_focus == 'two_way' AND athlete.age >= 12:
      blocks = ['morning_pitching', 'afternoon_hitting']
    ELSE IF skill_focus == 'pitching':
      blocks = ['morning_pitching']
    ELSE:
      blocks = ['afternoon_hitting']

    FOR each block IN blocks:
      skill = block.skill  // 'hitting' or 'pitching'

      eligible = get_eligible_coaches(athlete, day_number, is_first_day, is_final_day, assignments)
      available = filter_available(eligible, date, block)
      ranked = rank_coaches(available, athlete, assignments, is_final_day)

      IF ranked.length == 0:
        flag_conflict(date, block, "No eligible coach available")
        assignments.push({ date, block, coach: NULL, conflict: true })
      ELSE:
        best = ranked[0]
        assignments.push({ date, block, coach: best, conflict: false })

  RETURN assignments
```

### 3.3 Eligibility Filter (Hard Constraints)

```
FUNCTION get_eligible_coaches(athlete, day_number, is_first, is_final, prior_assignments):
  all_coaches = get_all_active_coaches()

  // R1: Day 1 tier requirement based on athlete level
  IF is_first AND athlete.level IN {pro, college, high_level_hs}:
    IF athlete.level == 'pro':
      eligible = all_coaches.filter(c => c.tier == 'S1')  // R4: Pro Day 1 must be S1
    ELSE:
      eligible = all_coaches.filter(c => c.tier IN {'S1', 'S2'})
  ELSE IF is_first:
    eligible = all_coaches  // Any tier OK for non-advanced Day 1
  ELSE:
    // R2: Day 2+ tier ceiling
    day1_tier = prior_assignments.find(a => a.day_number == 1).coach.tier
    IF day1_tier == 'S1':
      eligible = all_coaches  // S1, S2, J1 all allowed
    ELSE IF day1_tier == 'S2':
      eligible = all_coaches.filter(c => c.tier IN {'S2', 'J1'})
    ELSE:
      eligible = all_coaches.filter(c => c.tier == 'J1')

  // R4: Pro final day must be S1
  IF is_final AND athlete.level == 'pro':
    eligible = eligible.filter(c => c.tier == 'S1')

  RETURN eligible
```

### 3.4 Availability Filter (Capacity Check)

```
FUNCTION filter_available(eligible, date, block):
  available = []

  FOR each coach IN eligible:
    // T3: Coach can only be in one slot per time block
    existing_slots = get_slots(coach, date, block)

    IF existing_slots.length == 0:
      available.push(coach)  // Completely free
      CONTINUE

    // G1/G2: Check group size
    slot = existing_slots[0]  // Should only be one
    current_count = slot.athletes.length

    IF athlete.level == 'pro':
      // G2: Pro needs solo or college+ pair
      IF current_count == 0:
        available.push(coach)
      ELSE IF current_count == 1 AND slot.athletes[0].level IN {pro, college}:
        available.push(coach)
      // Else: slot full for pro
    ELSE:
      // G1: Standard max 3
      IF current_count < 3:
        // But check: does the slot already have a pro?
        IF slot.athletes.any(a => a.level == 'pro'):
          SKIP  // Can't add non-college to a pro slot
        ELSE:
          available.push(coach)

  RETURN available
```

### 3.5 Ranking Function (Soft Preferences)

```
FUNCTION rank_coaches(available, athlete, prior_assignments, is_final_day):
  scored = available.map(coach => {
    score = 0

    // P1: Final day S1/S2 preference (high weight)
    IF is_final_day AND coach.tier IN {'S1', 'S2'}:
      score += 100

    // P2: Coach continuity (medium weight)
    prior_coach_ids = prior_assignments.map(a => a.coach.id)
    IF coach.id IN prior_coach_ids:
      score += 50

    // P3: Load balancing (low weight)
    // Fewer existing slots today = higher score
    today_load = count_slots(coach, today)
    score += (10 - today_load) * 5  // Max 50 points for 0 load

    // P4: Tier preference (tiebreaker)
    // Prefer assigning higher-tier coaches to higher-level athletes
    IF athlete.level IN {pro, college} AND coach.tier == 'S1':
      score += 10
    IF athlete.level IN {youth, middle_school} AND coach.tier == 'J1':
      score += 10  // Save senior coaches for advanced athletes

    RETURN { coach, score }
  })

  RETURN scored.sort_by(s => -s.score).map(s => s.coach)
```

---

## 4. Conflict Detection Engine

Conflicts are checked BEFORE saving any assignment and on a nightly sweep.

### 4.1 Pre-Save Validation

Every time an assignment is created or modified, run:

```
FUNCTION validate_assignment(slot):
  errors = []    // Hard constraint violations (block save)
  warnings = []  // Soft preference violations (allow save, flag)

  // HARD: Coach double-booking
  IF coach_has_other_slot(slot.coach, slot.date, slot.block):
    errors.push("Coach {name} is already assigned to another session at this time")

  // HARD: Group size exceeded
  IF slot.athletes.length > max_group_size(slot):
    errors.push("Group size limit exceeded ({count}/{max})")

  // HARD: Tier violation
  IF NOT passes_tier_check(slot):
    errors.push("Coach tier {tier} not eligible for this athlete/day combination")

  // HARD: Pro grouping violation
  IF slot.has_pro AND slot.has_non_college:
    errors.push("Pro athlete cannot be grouped with non-college athletes")

  // HARD: Under-12 two-way violation
  IF slot.athlete.age < 12 AND slot.experience.skill_focus == 'two_way':
    errors.push("Athletes under 12 cannot do two-way training")

  // SOFT: Final day not S1/S2
  IF slot.is_final_day AND slot.coach.tier == 'J1':
    warnings.push("Final day exit evaluation recommended with S1/S2 coach")

  // SOFT: Tier escalation (going up from Day 1)
  IF slot.day_number > 1:
    day1_tier_rank = tier_rank(slot.day1_coach.tier)
    current_tier_rank = tier_rank(slot.coach.tier)
    IF current_tier_rank > day1_tier_rank:
      warnings.push("Coach tier is higher than Day 1 coach — unusual but allowed as override")

  RETURN { valid: errors.length == 0, errors, warnings }
```

### 4.2 Nightly Conflict Sweep

A scheduled job (2 AM via n8n) scans upcoming 14 days:

```
FOR each date IN next_14_days:
  FOR each coach:
    slots = get_slots(coach, date)

    // Double-booking check
    morning_slots = slots.filter(s => s.block == 'morning')
    afternoon_slots = slots.filter(s => s.block == 'afternoon')
    IF morning_slots.length > 1: flag_conflict(...)
    IF afternoon_slots.length > 1: flag_conflict(...)

    // Overload check
    FOR each slot IN slots:
      IF slot.athletes.length > max_for_slot(slot): flag_conflict(...)

  FOR each experience starting on date:
    // Verify all days have assignments
    IF any_day_unassigned(experience): flag_conflict(...)

    // Verify tier progression is valid
    IF tier_progression_invalid(experience): flag_conflict(...)
```

---

## 5. Capacity Analysis

### 5.1 Maximum Daily Capacity

```
Coaches:  11 total (5 S1, 2 S2, 4 J1)
Blocks:   2 per day (morning, afternoon)
Max group: 3 athletes per coach per block

Theoretical max per block: 11 coaches * 3 athletes = 33 athletes
Theoretical max per day:   33 * 2 blocks = 66 athlete-slots

But two-way athletes consume 2 blocks each.
```

**Realistic peak scenario** (busy summer week):
- 6 two-way athletes (12 slots consumed)
- 4 hitting-only athletes (4 slots consumed)
- 2 pitching-only athletes (2 slots consumed)
- 1 pro athlete (2 solo slots consumed)
- **Total: 13 athletes, 20 slots needed**

With 22 available slots (11 coaches * 2 blocks), this fits with 2 slots spare. The algorithm handles this comfortably.

### 5.2 Constraint Tightness Analysis

The binding constraint is **S1 availability for pro athletes**:

- 5 S1 coaches
- Pro athletes need S1 on Day 1 AND Final Day
- If 3+ pro athletes overlap dates, Day 1 S1 slots could conflict

**Mitigation**: The system flags when S1 availability drops below 2 for any date within the booking window. This gives ops a 2-week warning to either:
- Stagger pro bookings
- Upgrade S2 to emergency S1 backup (as noted in PRD)

### 5.3 Edge Cases

| Edge Case | How System Handles It |
|-----------|----------------------|
| 2 pro athletes on same Day 1 | Both need S1. If 5 S1 coaches available, no problem. System assigns different S1 coaches. |
| 3+ pro athletes on same day | Possible S1 exhaustion for final days. System warns at booking time. |
| All S1 coaches out sick | Emergency: S2 can backfill (PRD allows "emergency S1 backup"). System requires manual override with reason. |
| Athlete extends stay (adds days) | Re-run suggest_assignments for new days only. Existing assignments preserved. |
| Coach calls out day-of | Ops manually reassigns. System suggests alternatives respecting constraints. |
| Two-way athlete under 12 | Blocked at Experience creation time (R6). Cannot proceed. |
| Experience canceled mid-stay | All future slots marked canceled. Coach capacity freed immediately. |

---

## 6. Data Model Refinement

Based on this analysis, the `schedule_slots` table from the design doc needs refinement:

```sql
CREATE TABLE schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id),
  coach_id UUID REFERENCES users(id),  -- NULL = unassigned (conflict)
  date DATE NOT NULL,
  time_block TEXT NOT NULL CHECK (time_block IN ('morning', 'afternoon')),
  skill TEXT NOT NULL CHECK (skill IN ('hitting', 'pitching')),
  day_number INTEGER NOT NULL,  -- 1-indexed day within experience
  is_final_day BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'conflict')),
  conflict_reason TEXT,  -- populated when status = 'conflict'
  override_reason TEXT,  -- populated when ops manually overrides a warning
  group_slot_id UUID,  -- links athletes sharing the same coach+date+block
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique: one coach per block per date (unless NULL)
  -- Enforced in application logic, not DB constraint (because groups share a slot)
  CONSTRAINT valid_day_number CHECK (day_number >= 1)
);

-- Critical indexes for scheduling queries
CREATE INDEX idx_slots_coach_date ON schedule_slots(coach_id, date);
CREATE INDEX idx_slots_date_block ON schedule_slots(date, time_block);
CREATE INDEX idx_slots_experience ON schedule_slots(experience_id);
CREATE INDEX idx_slots_lead ON schedule_slots(lead_id);
CREATE INDEX idx_slots_status ON schedule_slots(status) WHERE status = 'conflict';
```

### Group Slot Concept

When 3 athletes share the same coach at the same time, they each have their own `schedule_slot` row but share a `group_slot_id`. This allows:
- Per-athlete status tracking (one can be canceled while others continue)
- Group size computed as: `COUNT(*) WHERE group_slot_id = X AND status != 'canceled'`
- Session notes linked to individual athletes, not groups

### Coach Availability Table

Add an explicit availability model for handling days off, sick days, vacations:

```sql
CREATE TABLE coach_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,  -- 'vacation', 'sick', 'personal', 'travel'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, date)
);
```

The availability filter adds: `AND coach.id NOT IN (SELECT coach_id FROM coach_availability WHERE date = target_date AND available = false)`

---

## 7. API Design for Scheduling

### POST `/api/schedule/suggest`
**Input**: `{ experience_id }` (experience already created with athlete, dates, skill_focus)
**Output**: Array of suggested assignments with scores and any conflicts
```json
{
  "suggestions": [
    {
      "date": "2026-03-15",
      "day_number": 1,
      "is_final_day": false,
      "blocks": [
        {
          "time_block": "morning",
          "skill": "pitching",
          "suggested_coach": { "id": "...", "name": "Eugene", "tier": "S1", "score": 160 },
          "alternatives": [
            { "id": "...", "name": "Nate", "tier": "S1", "score": 110 },
            { "id": "...", "name": "Jacob", "tier": "S2", "score": 60 }
          ],
          "conflict": null
        },
        {
          "time_block": "afternoon",
          "skill": "hitting",
          "suggested_coach": { "id": "...", "name": "Eugene", "tier": "S1", "score": 210 },
          "alternatives": [...],
          "conflict": null
        }
      ]
    }
  ],
  "warnings": ["Final day (Day 3) has only J1 coaches available — consider rebooking"],
  "capacity_notes": { "s1_remaining_day1": 3, "total_slots_remaining_day1": 8 }
}
```

### POST `/api/schedule/assign`
**Input**: `{ assignments: [{ schedule_slot_id, coach_id }] }`
**Behavior**: Validates all constraints, saves if valid, returns errors if not.
**Output**: `{ success: true, warnings: [...] }` or `{ success: false, errors: [...] }`

### POST `/api/schedule/override`
**Input**: `{ schedule_slot_id, coach_id, override_reason }`
**Behavior**: Bypasses soft constraints (but NOT hard constraints like double-booking). Logs override.

### GET `/api/schedule/conflicts`
**Input**: `{ start_date, end_date }`
**Output**: All conflicts in the date range with severity and suggested resolution.

### GET `/api/schedule/capacity`
**Input**: `{ date }`
**Output**: Per-tier availability count, per-block slots remaining, flagged dates.

---

## 8. UI Interaction Flow

### Ops books a new Experience:
1. Select athlete (from leads/converted list)
2. Enter dates + skill focus
3. System auto-runs suggest_assignments
4. Ops sees suggested schedule with coach names, scores, and any warnings
5. Ops can accept suggestions or manually swap coaches (dropdown shows alternatives)
6. On confirm: all schedule_slots created, coach notifications sent
7. If conflicts exist: slots created with status='conflict', ops alerted to resolve

### Ops views master schedule:
1. Calendar view showing all coaches as rows, dates as columns
2. Each cell shows athletes assigned to that coach on that date
3. Color coding: green=scheduled, yellow=warning, red=conflict, gray=day-off
4. Click a cell to see full dossier + reassign
5. Filter by: coach, date range, athlete level, skill

### Coach views their schedule:
1. "Today" view: list of athletes with time blocks
2. Each athlete card: name, dossier summary (expandable), skill focus, day number
3. Tap to expand full dossier (progressive disclosure)
4. After session: quick-action button to log notes

---

## 9. Testing Strategy

### Unit Tests (Vitest)
- `get_eligible_coaches()` — test all tier combinations
- `filter_available()` — test group size limits, pro restrictions
- `rank_coaches()` — test scoring with various preference weights
- `validate_assignment()` — test every hard constraint violation

### Scenario Tests
| Scenario | Expected Result |
|----------|----------------|
| Standard 3-day hitting Experience, HS athlete | J1/S2/J1 or any valid tier sequence |
| 5-day two-way Experience, college athlete | S1/S2 Day 1, S1 Final Day, morning+afternoon blocks each day |
| Pro 3-day, 2 pros on same dates | Each gets solo S1 on Day 1, different S1 coaches |
| Max capacity: 12 athletes, 1 pro, on same day | All assigned, no conflicts |
| Over capacity: 35+ athletes on same day | Conflicts flagged for overflow slots |
| Coach sick day mid-Experience | System suggests replacement respecting tier ceiling |
| 11-year-old requests two-way | Blocked at booking |

---

## 10. Recommendation

The greedy rule-based algorithm with pre-save validation and nightly sweep is **the right approach** for 108's scale. Here's why:

1. **Explainable**: Ops can see exactly why a coach was suggested (tier rule, availability, score breakdown)
2. **Overridable**: Hard constraints prevent true errors, soft constraints warn but allow
3. **Fast**: At 11 coaches and <20 daily athletes, the algorithm runs in <10ms
4. **Maintainable**: Rules are simple IF/THEN logic, not black-box optimization
5. **Extensible**: Adding a new rule = adding a filter or scoring line, not retraining a model

If 108 scales to 50+ coaches across multiple locations (Phase 3 of the Athlete OS), upgrade to a proper constraint satisfaction solver (OR-Tools) at that point. The data model is already structured to support either approach.

---

**END OF SCHEDULING ALGORITHM ANALYSIS**
