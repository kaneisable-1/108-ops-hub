# Neumorphic Accents Design — Approach A

**Date:** 2026-02-23
**Status:** Approved
**Scope:** CSS-only tactile layer on interactive elements

## Summary

Add soft inner shadows and pressed states to interactive elements across the 108 Ops Hub dashboard. Cards, backgrounds, and layout remain flat. Only buttons, inputs, toggles, tabs, and stat tiles get the tactile treatment. Apple-inspired neumorphic-lite — no textures, no theming, just light and shadow creating physical depth.

## Design Principles

1. **Interactive elements feel physical** — buttons raise, inputs carve in, tabs press down
2. **Content containers stay flat** — cards keep hairline borders, no neumorphic treatment
3. **Sidebar untouched** — remains the dark contrast anchor
4. **Brand blue (#19B5E5) unchanged** — still used surgically for active states
5. **~50 lines of CSS** — minimal footprint, easy to maintain

## Element Specifications

### Buttons (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-icon`)

**Idle state (raised):**
- Soft outer shadow: `0 2px 6px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- Subtle top-edge highlight: `inset 0 1px 0 rgba(255,255,255,0.5)` (gives raised feel)

**Hover state:**
- Shadow expands slightly: `0 4px 12px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)`
- Existing transforms preserved

**Active/pressed state (`:active`):**
- Shadow flips to inner: `inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)`
- Remove outer shadow entirely
- Scale down slightly (existing `scale(0.98)` already handles this)
- Transform: `translateY(1px)` to simulate physical depression

**btn-ghost exception:** No raised shadow at idle (stays transparent). Only gets pressed inner shadow on `:active`.

**btn-icon exception:** Subtle raised shadow only. Pressed state on `:active`.

### Inputs & Selects (`.input`, `.select`)

**Inset/carved feel:**
- Inner shadow: `inset 0 2px 4px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)`
- Remove or reduce outer border opacity (border becomes secondary to shadow for definition)
- Border stays for focus ring behavior

**Focus state:**
- Keep existing blue border + glow
- Inner shadow lightens slightly to indicate "activated" state

### Tab Switchers & Segmented Controls

**Inactive tab:**
- Flat, no shadow (current behavior)

**Active tab:**
- Pressed into surface: `inset 0 1px 3px rgba(0,0,0,0.10), inset 0 1px 1px rgba(0,0,0,0.06)`
- Background shifts to `var(--bg-primary)` (white) to contrast with secondary bg
- Subtle bottom highlight edge

### Stat Tiles (`.stat-tile`)

**Softly raised:**
- Replace current `--shadow-sm` with neumorphic outer: `0 3px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)`
- Add subtle inner top highlight: `inset 0 1px 0 rgba(255,255,255,0.6)`
- Feels like a physical tile sitting on the desk

### Status Badges (`.badge-*`)

**Subtly raised pill:**
- Add micro shadow: `0 1px 2px rgba(0,0,0,0.06)`
- Gives badges a physical "sticker" feel without being heavy

### Kanban Cards (`.kanban-card`)

**Dragging state enhancement:**
- Existing shadow-lg preserved
- Add slight inner highlight: `inset 0 1px 0 rgba(255,255,255,0.4)` when picked up

### Toggle / Switch (if present)

**Off:** Inset groove shadow
**On:** Raised knob with outer shadow, track gets inner shadow

## What Does NOT Change

- Card base (`.card`, `.card-interactive`) — keeps hairline borders, no neumorphic treatment
- Sidebar — stays dark/flat
- Page headers — stays flat
- Panels/sheets — keeps current shadow system
- Data tables — stays flat
- Background colors — stay as-is (#FFFFFF / #F5F5F7)
- Typography — unchanged
- Layout constraints — unchanged
- Color tokens — unchanged
- Dark mode — shadows invert naturally (already darker in dark theme tokens)

## Dark Mode Considerations

- Inner shadows use `rgba(0,0,0,...)` which already works in dark mode (deeper blacks)
- Top-edge highlights use `rgba(255,255,255,...)` — reduce opacity to ~0.08 in dark mode
- No dark-mode-specific tokens needed — the existing `[data-theme="dark"]` shadow tokens handle elevation

## Implementation

All changes go in `src/app/globals.css` within existing `@layer components` block. No component TSX files need modification — all effects are CSS-only through existing class names.

Estimated: ~50 lines of CSS additions/modifications.
