---
name: Apex POS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  kpi-value:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an ultra-refined, high-velocity operating environment engineered for multi-location enterprise merchants, flagship retail managers, and frontline cashier terminals. The visual language bridges mission-critical point-of-sale utility with executive-grade fintech intelligence.

### Design Movement & Core Philosophy
The aesthetic is **Precision Enterprise Modernism**—anchored by structural grid discipline, near-zero visual latency, and low-contrast borders instead of noisy drop shadows. It draws inspiration from premier payment rails and merchant infrastructure:
- **Clarity Over Clutter:** Dense transactional information is made effortlessly legible through strict typographic hierarchy, disciplined vertical rhythm, and deliberate surface tinting.
- **Tactile Reliability:** Digital controls mirror hardware confidence. Interactive surfaces provide micro-states that confirm inputs instantly, critical in high-pressure checkout queues.
- **Fintech Rigor:** Monetary figures, inventory counts, and settlement telemetry are rendered with tabular alignments and mono-styled numerical discipline, preventing visual jitter during dynamic state shifts.

## Colors

The palette balances deep structural slates with focused, high-intent chromatic signals. The canvas relies on calm, neutral whites and cool zinc tints to allow inventory catalogs, order queues, and performance metrics to command attention.

### Palette Architecture
- **Primary (`#4F46E5` / Electric Indigo):** Represents action, checkout confirmation, and active navigation states. Modulated to `#4338CA` on press and `#EEF2FF` for ambient active item indicators.
- **Secondary (`#0F172A` / Deep Slate):** Anchors high-order structures including the permanent left rail navigation, checkout drawer receipt headers, and primary data table column titles.
- **Tertiary (`#10B981` / Emerald Cash):** Dedicated to fiscal inflows, approved authorizations, cash drawer balances, and positive month-over-month telemetry.
- **Neutral (`#64748B` / Slate Grey):** Manages secondary metadata, inactive borders (`#E2E8F0`), surface wells (`#F8FAFC`), and deactivated touchpoints.

### Semantic Alerts & Metrics
- **Warning / Till Alerts (`#F59E0B` Amber):** Applied to open float variations, low-paper roll warnings, and batch closure delays.
- **Destructive / Chargebacks (`#F43F5E` Rose):** Reserved exclusively for transaction declines, refunds, chargeback arbitration alerts, and emergency till locks.
- **Surface Hierarchy:** Layer 0 canvas starts at `#F8FAFC`. Elevated modules sit on pure `#FFFFFF` with 1px border rules rendered in `#E2E8F0`.

## Typography

The typographic pairing balances modern structural character with high-density data readability.

### Type Pairings & Editorial Intent
- **Display & Headings (Plus Jakarta Sans):** Brings contemporary warmth and geometric polish to macro metrics, section anchors, and operational modal titles. Subtle negative letter tracking ensures words remain visually locked together across high-resolution displays.
- **Data Tables, Navigation & Controls (Inter):** Serves as the functional engine. Used across grid rows, order modifier trees, barcode fields, and fiscal totals. Features open counters, unambiguous digit differentiation (e.g., zero vs. capital O), and uniform spacing across numbers via `font-feature-settings: "tnum" 1`.

### Numerical Conventions
All currency amounts, stock counts, batch IDs, and terminal timestamps must enforce tabular numerals (`tnum`). This guarantees that dynamic price adjustments on the register screen remain rock-solid without causing horizontal layout tremors.

## Layout & Spacing

The layout is built on a 4px geometric sub-grid and an 8px macro component rhythm, tuned to maximize usable workspace on 10-inch counter tablets through to 32-inch manager console monitors.

### Grid & Architecture
- **Desktop / Terminal Landscape (≥ 1280px):** 12-column adaptive workspace. A persistent 64px collapsed (or 240px expanded) navigation rail sits left, accompanied by a flexible product catalog/reporting canvas, and an optional docked 380px transaction staging drawer on the right.
- **Tablet Hybrid (768px – 1279px):** Split-view orientation where product catalog and cart staging share a 60/40 visual weight. Outer margin narrows to `1rem` to retain touch target efficiency.
- **Mobile Handheld (< 768px):** Single-column stacked workflow. The staging cart converts into a persistent floating bottom checkout trigger bar, expanding to a full-screen bottom sheet when pressed.

### High-Density Spacing Logic
Standard software density yields excessive vertical scrolling during peak business hours. Consequently, data tables and register line-item lists adopt compact vertical bounds (`space-sm` padding, `space-xs` item gap) with generous horizontal breathing room (`space-md`) to ensure tap accuracy without fat-finger errors.

## Elevation & Depth

This design system avoids heavy, blurred atmospheric shadows in favor of a crisp, layered architectural hierarchy using structural ghost outlines and subtle surface color tiering.

### Elevation Layers
- **Surface Level 0 (Base / Canvas):** `#F8FAFC`. The foundational canvas beneath dashboard modules and POS registers.
- **Surface Level 1 (Panels & Card Containers):** `#FFFFFF`. Bound by a crisp `1px solid #E2E8F0` border. No shadow required in standard states.
- **Surface Level 2 (Hover States, Popovers & Context Menus):** `#FFFFFF` paired with a micro-depth shadow: `0 2px 4px -1px rgba(15, 23, 42, 0.04), 0 4px 6px -1px rgba(15, 23, 42, 0.06)` enclosed by an explicit `#CBD5E1` edge.
- **Surface Level 3 (Drawers, Modals & Tender Overlays):** `#FFFFFF` anchored over a backdrop scrim (`rgba(15, 23, 42, 0.45)` with 4px backdrop blur), featuring deep directional grounding: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`.

### Border Discipline
Borders carry informational hierarchy:
- Inactive / Base Containers: `1px solid #E2E8F0`
- Active / Focused Form Inputs: `1px solid #4F46E5` accompanied by an indigo ring glow (`0 0 0 3px rgba(79, 70, 229, 0.15)`)
- Selected Terminal Line Items: `1.5px solid #4F46E5` with `#F5F3FF` surface fill

## Shapes

The interface adopts a disciplined **Soft (1)** shape language. The subtle radius communicates contemporary engineering precision without the toy-like look of over-rounded forms.

### Geometry Specifications
- **Micro UI (Badges, Checkboxes, Micro-toggles):** 4px (`0.25rem`) corner radius.
- **Core Interactive Elements (Buttons, Inputs, Selectors, Table Row Highlights):** 6px (`0.375rem`) to 8px (`0.5rem` / `rounded-lg`).
- **Cards, Modules & Staging Panels:** 8px (`0.5rem`) to 12px (`0.75rem` / `rounded-xl`).
- **Pill Exceptions:** Strictly confined to status badges (e.g., "Settled", "Pending Sync") and segmented category filters to provide quick shape contrast against rectangular data tables.

## Components

### Buttons
- **Primary:** `#4F46E5` background, `#FFFFFF` text, 6px radius, `0.5rem` vertical by `1rem` horizontal padding. Hover shifts to `#4338CA`. Active state scales subtly (`scale(0.98)`).
- **Secondary (Destructive / Tender):** Emerald `#10B981` for "Complete Payment"; Rose `#F43F5E` for "Void Order" or "Refund".
- **Outline / Ghost:** `#FFFFFF` background with `1px solid #E2E8F0` border and `#0F172A` text. Hover prompts background `#F8FAFC` and border `#CBD5E1`.

### Data Tables (High Density)
- **Header:** Height 36px, `#F8FAFC` fill, border-bottom `1px solid #E2E8F0`. Text is `label-caps` in `#64748B`.
- **Rows:** Height 44px (standard) or 36px (compact). Bottom border `1px solid #F1F5F9`. Hover state shifts row to `#F8FAFC`.
- **Numerical Alignment:** Monospace/tabular alignment right-aligned for monetary columns, center-aligned for unit counts, left-aligned for SKU/descriptions.

### KPI Stat Cards
- Enclosed in `1px solid #E2E8F0` card modules on `#FFFFFF`.
- Features metric title in `body-sm` (`#64748B`), large total in `kpi-value` (`#0F172A`), and inline micro-badge showing percentage trends with directional arrows: green tint (`#ECFDF5`, text `#059669`) for positive growth, rose tint (`#FFF1F2`, text `#E11D48`) for losses.

### Segmented Controls
- Container background `#F1F5F9`, 6px corner radius, 3px inner padding.
- Active segment: `#FFFFFF` pill card with crisp border `1px solid #E2E8F0`, subtle micro-shadow, and `#0F172A` medium text weight. Inactive segments show `#64748B` text with transparent background.

### Input Fields & Search Controls
- Height 38px (44px on touch terminal mode).
- Inset padding `0.5rem` vertical by `0.75rem` horizontal.
- Default border `1px solid #CBD5E1`. Focus state transitions instantly to border `#4F46E5` with `0 0 0 3px rgba(79, 70, 229, 0.12)`. Integrated barcode scanner icons and keyboard shortcut badges (`⌘K`) sit right-aligned in `#94A3B8`.

### Status Badges & Chips
- Padding: `2px 8px`, 9999px radius (pill), font `body-sm` at 500 weight.
- **Success / Paid:** `#ECFDF5` background, `#059669` text, `1px solid #A7F3D0` border.
- **Warning / Unsettled:** `#FEF3C7` background, `#D97706` text, `1px solid #FDE68A` border.
- **Refund / Voided:** `#FFF1F2` background, `#E11D48` text, `1px solid #FECDD3` border.
- **Neutral / Draft:** `#F1F5F9` background, `#475569` text, `1px solid #E2E8F0` border.