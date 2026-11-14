# SPEC — ASCENT v1.0.0 Feature Checklist

Every item has an ID (F1…Fn) referenced in commits, tests, and the final report. "Works when clicked" is the acceptance bar for all.

## Library (content)
- F1: 100+ exercises. Each: name, pattern, equipment, difficulty 1–10, metric (reps | hold-seconds | level), chain + step, 3–5 coaching cues, 3 common mistakes, target muscles, safety notes (table stability, wrist prep, Nordic anchoring, bridge prerequisites).
- F2: Push-up chain: wall → incline → knee → full → diamond → pseudo-planche → archer → one-arm push-up.
- F3: Handstand push-up chain: pike → elevated pike → wall HSPU negative → wall HSPU.
- F4: Row chain: door-frame row → bent-knee table row → straight-leg → feet-elevated → archer table row.
- F5: Squat chain: chair box squat → full squat → split squat → Bulgarian → assisted pistol → box pistol → pistol → shrimp.
- F6: Hip/hamstring chain: glute bridge → single-leg → couch hip thrust → towel slider curl → Nordic negative → Nordic.
- F7: Core chain: dead bug → plank → hollow hold → hollow rocks → tuck dragon flag → one-leg → full dragon flag.
- F8: L-sit chain: chair L-sit → tuck → full → V-sit.
- F9: Skill chain: crow → elbow lever.
- F10: Handstand chain: wall handstand → chest-to-wall → shoulder taps → freestanding → press negative.
- F11: Planche chain: planche lean → tuck → advanced tuck → straddle → full planche.
- F12: Front lever chain: table tuck front lever → advanced tuck → one-leg → straddle.
- F13: Bridge chain: table bridge → wall walk → full bridge → bridge push-up.
- F14: Optional bar (toggle, default off): pull-up, hanging leg raise, muscle-up. Excluded from plans unless enabled.
- F15: Mobility/flexibility chains (levels + holds): forward fold, pancake, front split, side split, shoulder flexion (wall test + towel dislocates in hand-widths), deep squat, couch stretch, wrist routine, ankle rocks, thoracic rotation.
- F16: ~80 seeded foods per 100g + household measures.
- F17: `audit:content` verifies: unique IDs, contiguous chain steps, every unlock criterion references a real exercise/metric, no empty cue arrays, valid equipment tags.

## Onboarding & placement
- F18: Goal emphasis sliders (strength / skills / flexibility).
- F19: Experience, equipment, days/week (2–6), session length (20/30/45/60), units, optional age/height/sex.
- F20: Optional 10-minute assessment (max push-ups, max table rows, plank, hollow, wall handstand, deep squat hold, fold level, split self-report) auto-places every chain.
- F21: Manual override always available; never forced through baby steps.

## Program engine
- F22: 4-week mesocycle; 3 build weeks + deload at 60% volume.
- F23: 2–3 days full body, 4 days upper/lower, 5–6 days push/pull/legs + dedicated mobility session.
- F24: Session shape: warm-up → skill (fresh) → strength → flexibility cooldown; optional daily 12-min Morning Limber.
- F25: Double progression: top of rep range on all sets at RPE ≤ 8 → next step; holds 20 → 40s then next step; miss twice → repeat, three times → regress.
- F26: Flexibility: 60–90s total per stretch; level up after 3 sessions at RPE ≤ 6.
- F27: Balance straight-arm/bent-arm and push/pull volume.
- F28: Regenerate on profile change; every session shows a rule-generated plain-language "why this workout".

## Workout player
- F29: Fullscreen, one-handed phone use; cues, big set-logging targets.
- F30: Auto rest timer (skip / +30s, audible countdown, animated ring).
- F31: Hold timer, RPE chips, per-set notes.
- F32: Equipment-aware swap (same pattern ±1 difficulty).
- F33: Skip; finish summary (volume, PRs, XP, streak).
- F34: Wake lock where available.

## Skill trees
- F35: Interactive SVG skill trees (pan/zoom, keyboard-navigable): handstand, planche, front lever, L-sit→V-sit, one-arm push-up, pistol→shrimp, dragon flag, bridge, elbow lever, splits & pancake.
- F36: Nodes show exact measurable criteria. Current highlighted, completed checked, locked shows criteria.
- F37: "Train this" re-targets the plan; unlocks fire XP + celebration.

## Body
- F38: Weight trend (kg/lb).
- F39: Measurements charts: shoulders, chest, waist, hips, arm, thigh, calf.
- F40: Progress photos front/side/back stored as IndexedDB blobs with thumbnails; never leave the device.
- F41: Compare slider; delete with undo; designed empty state.

## Fuel
- F42: Mifflin-St Jeor TDEE × activity; cut / maintain / lean-gain.
- F43: Protein 1.8 g/kg, fat 25% kcal, carbs remainder; editable targets (manual if profile skipped).
- F44: ~80 seeded foods per 100g; search, favorites/recents, custom food CRUD.
- F45: Four meals; kcal + P/C/F rings; water counter; day navigation.
- F46: Weekly average + protein adherence charts.

## Gamification
- F47: XP: set +5, workout +50, PR +40, flexibility level +60, skill unlock +150.
- F48: Levels with rank titles.
- F49: ~24 badges; badge cabinet.
- F50: Streak counts scheduled training days; rest days never break it.
- F51: PR = palette paper-confetti + chime + toast; level-up modal. No reminders, no social, no wearables.

## Data
- F52: Single user, 100% local, autosave, versioned migrations.
- F53: Export full JSON backup (photos base64, size warning).
- F54: Import with zod validation, backup-before-replace, atomic rollback on failure.
- F55: Lossless round-trip required.
- F56: Demo seeder: 8 weeks of believable workouts, body entries, food logs.

## Screens
- F57: Today
- F58: Train
- F59: Skills
- F60: Library
- F61: Body
- F62: Fuel
- F63: Progress (12-week heatmap, volume by pattern, strength/hold/level curves, PR timeline, body trends, badges)
- F64: History (calendar + list, edit/delete with undo, detail drawer)
- F65: Settings (units, sound, rest defaults, export/import, demo data, reset)
- F66: Desktop fixed sidebar; mobile bottom tabs Today/Train/Skills/Body/More (sheet).

## Platform
- F67: PWA installable and fully offline.
- F68: Electron desktop; portable Windows exe via `npm run dist:win`.
- F69: Offline reload + lossless round-trip + packaging verified.
