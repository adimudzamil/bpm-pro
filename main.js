/**
 * ========================================================================
 *  BPM PRO – Passenger Meal & Tier Report Generator
 *  ========================================================================
 *  MAIN.JS – Architecture & Developer Guide
 *
 *  This file powers the Passenger Meal & Tier Report tool used by cabin
 *  crew to quickly generate print‑ready reports from BPM manifests.
 *
 *  ─── HOW TO ADD A NEW SCRIPT ──────────────────────────────────────────
 *  1. Import or paste your new script at the top of this file (or in a
 *     separate module) and call its `init()` function inside the
 *     `DOMContentLoaded` event listener.
 *  2. If your script needs to react to report generation, hook into
 *     `generateReportWithCurrentSettings()` or extend the UI controls.
 *  3. Keep functions small and focused – see the “Extensibility Points”
 *     section below for safe places to add new features.
 *
 *  ─── OVERVIEW ──────────────────────────────────────────────────────────
 *  This tool parses a BPM passenger manifest (plain text), extracts
 *  passenger details (name, seat, class, tier, meal, DOB), and builds a
 *  visual report with:
 *    • Global and per‑zone summaries (meal counts, EMER/PLAT, birthdays).
 *    • Configurable layout styles: Single column, Port/Starboard split,
 *      Seat Chart (Alpha VainGlory), Business Class Seat Chart, Dual Chart.
 *    • Aircraft‑specific seat maps (737NG, 737MAX, 737NR, A330‑300/‑200,
 *      A330‑900, A350‑900, A350‑MAH) with auto‑detection from registration.
 *    • Advanced print settings (font size, table width, page breaks,
 *      margins, scale).
 *    • Dual‑chart mode for comparing two service runs.
 *
 *  ─── CORE DATA STRUCTURES ──────────────────────────────────────────────
 *  • Passenger object:
 *      { title, name, seat, pnr, class, fqtv, tier, meal, remark, dob,
 *        hasBirthday }
 *
 *  • FlightInfo object:
 *      { flightNumber, sector, aircraft, date, stdLocal }
 *
 *  • Zone object (used by AIRCRAFT_CONFIGS and custom zones):
 *      { name: 'B', start: 1, end: 3 }
 *
 *  • SEAT_MAPS: mapping of aircraft type to column layout, aisle
 *    positions, business‑specific columns, and seat letters.
 *
 *  • BUSINESS_CLASS_TEMPLATES: mapping of aircraft type to popup template
 *    file, business rows, and seat‑map exceptions.
 *
 *  ─── KEY FUNCTIONS (in order of call flow) ──────────────────────────
 *  1. parseManifest(text)
 *     → Extracts flightInfo and passenger array from raw manifest text.
 *     → Relies on CONFIG (TITLES, TIERS, DOB pattern, etc.).
 *
 *  2. detectAircraftType(passengers, flightInfo)
 *     → Returns 'narrowbody' or 'widebody' based on registration or seat
 *       letters.
 *
 *  3. getEffectiveAircraftConfig(detectedType, flightInfo, passengers)
 *     → Resolves the specific aircraft code (e.g., '737NG', '333') from
 *       auto‑detection or user selection.
 *
 *  4. getEffectiveLayout(detectedType)
 *     → Chooses the layout style ('single', 'port-starboard', 'seat-chart',
 *       'seat-chart-business', 'dual-chart-737') based on settings.
 *
 *  5. generateQuickReport()
 *     → Main entry point (triggered by button or Ctrl+Enter).
 *     → Auto‑detects aircraft/layout, updates dropdowns, then calls:
 *
 *  6. generateReportWithCurrentSettings()
 *     → Orchestrates the full report generation:
 *        - Filters passengers (special meals, EMER/PLAT, birthdays).
 *        - Builds flight info, global summary, zone summaries.
 *        - Calls generateTable() or generateSeatChart() per zone.
 *        - Handles dual‑chart mode by opening popups.
 *
 *  7. generateSeatChart(passengers, zone, aircraftConfig)
 *     → Produces HTML table for seat‑chart layout.
 *     → Uses SEAT_MAPS and BUSINESS_CLASS_TEMPLATES for business rows.
 *     → Applies font size, flip (aft perspective), and “show all
 *       business” options.
 *
 *  8. generateTable(passengers, showSeat, aircraftType)
 *     → Produces a simple columnar table for non‑seat‑chart layouts.
 *
 *  9. generateGlobalSummary(filtered) / generateZoneStats(passengers)
 *     → Create summary blocks with meal counts and special tiers.
 *
 *  ─── SETTINGS MANAGEMENT ──────────────────────────────────────────────
 *  • currentSettings object holds all user preferences (font size, table
 *    width, print options, etc.).
 *  • updateSettingsFromControls() reads DOM controls and updates
 *    currentSettings.
 *  • updateUIFromSettings() applies the settings to the output.
 *  • All controls (sliders, toggles, dropdowns) are wired to
 *    auto‑regenerate via debounce.
 *
 *  ─── PRINT & PDF SUPPORT ──────────────────────────────────────────────
 *  • window.print() is used directly; print styles are in style.css.
 *  • applyPrintSettings() reads margin and scale from UI and applies
 *    CSS custom properties for print‑time use.
 *  • Compact print mode, orphan‑row avoidance, and page‑break controls
 *    are handled via CSS classes and page‑break rules.
 *
 *  ─── EXTENSIBILITY POINTS ──────────────────────────────────────────────
 *  To add a new feature without breaking core logic, consider:
 *
 *  ① New Aircraft Type:
 *     → Add entry to AIRCRAFT_CONFIGS (zone definitions) and SEAT_MAPS.
 *     → If business class, add to BUSINESS_CLASS_TEMPLATES.
 *     → Update detectAircraftType() and getEffectiveAircraftConfig().
 *
 *  ② New Layout Style:
 *     → Add a new option to the <select id="layoutStyle">.
 *     → In generateReportWithCurrentSettings(), add a new conditional
 *       branch to generate the desired HTML structure.
 *
 *  ③ New Passenger Filter or Summary:
 *     → Modify the filtering logic (currently: meal, EMER/PLAT, birthday).
 *     → Add new fields to the Passenger object in parseManifest().
 *
 *  ④ New Popup Chart (like Business Class Seat Chart):
 *     → Create a new HTML template file (e.g., sc‑new‑type.html).
 *     → Add a new layout option that calls a dedicated open function.
 *     → Use localStorage to pass data to the popup.
 *
 *  ⑤ Dual‑chart Mode:
 *     → Already implemented via isDualChartMode and the
 *       generateDualChart() function.
 *     → To add a new dual‑chart scenario, extend the `if` check in
 *       generateReportWithCurrentSettings().
 *
 *  ⑥ New Print Options:
 *     → Add new controls in the Advanced Settings panel.
 *     → Update currentSettings and applyPrintSettings().
 *
 *  ─── EVENT BINDING & INITIALIZATION ──────────────────────────────────
 *  • All controls are initialised in the DOMContentLoaded listener.
 *  • Keyboard shortcut (Ctrl+Enter) triggers generateQuickReport().
 *  • Iframe loading for tutorial and version history is managed via
 *    helper functions (showIframeLoading, hideIframeLoading, etc.).
 *
 *  ─── DEPENDENCIES ──────────────────────────────────────────────────────
 *  • style.css – all visual styling (print styles included).
 *  • tutorial.html / versions.html – loaded as iframes (optional).
 *  • External libraries: none (pure vanilla JS).
 *
 *  ─── CODING STYLE ──────────────────────────────────────────────────────
 *  • Functions are organised by concern: parsing, generation, helpers.
 *  • Global variables are minimised; use currentSettings for preferences.
 *  • Avoid jQuery – use plain DOM APIs.
 *  • All new functions should be well‑named and include JSDoc comments.
 *
 *  ─── CONTACT ──────────────────────────────────────────────────────────
 *  • Original author: *2100551*
 *  • For bugs or feature requests, please refer to the acknowledgments
 *    section in the UI (or contact via the listed contributors).
 *
 *  Thank you 3000! ✈️
 *  ========================================================================
 */
