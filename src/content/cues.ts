/**
 * Shared coaching cue banks used across exercises and the library detail view.
 */

export const pushCues = [
  'Hands shoulder-width, elbows at ~45 degrees.',
  'Body straight from head to heels.',
  'Lower with control, press fully up.',
  'Breathe in on the way down, out on the way up.',
  'Squeeze glutes and core throughout.',
]

export const pullCues = [
  'Squeeze shoulder blades together at the top.',
  'Pull with your back, not just your arms.',
  'Body rigid, no hip sagging.',
  'Control the lowering phase.',
  'Chest to the surface, full range.',
]

export const squatCues = [
  'Feet shoulder-width, toes slightly out.',
  'Sit back and down, weight on heels.',
  'Chest up, back straight.',
  'Hips below knees at depth.',
  'Drive up through the heels.',
]

export const hingeCues = [
  'Hinge at the hips, soft knees.',
  'Keep the back neutral, not rounded.',
  'Squeeze glutes at the top.',
  'Feel the stretch in the hamstrings.',
  'Drive through the heels.',
]

export const coreCues = [
  'Press lower back into the floor.',
  'Brace the core as if being punched.',
  'Breathe steadily, do not hold breath.',
  'Move slowly with control.',
  'Keep ribs down, no arching.',
]

export const holdCues = [
  'Build tension throughout the body.',
  'Breathe shallowly, stay tight.',
  'Do not let the hips sag.',
  'Quality over time — stop if form breaks.',
  'Active shoulders, locked arms.',
]

export const mobilityCues = [
  'Move within a comfortable range.',
  'Never force or bounce into a stretch.',
  'Breathe deeply to release tension.',
  'Hold each position for time, not reps.',
  'Warm up before mobility work.',
]

export const commonMistakes = {
  saggingHips: 'Hips sagging — keep glutes and core tight.',
  flaredElbows: 'Elbows flared out — keep them at ~45 degrees.',
  archingBack: 'Lower back arching — keep ribs down.',
  holdingBreath: 'Holding your breath — breathe steadily.',
  forcingRange: 'Forcing range of motion — respect your current level.',
  unstableSurface: 'Using an unstable surface — check it won’t slide or tip.',
}

export const cueBank: Record<string, string[]> = {
  push: pushCues,
  pull: pullCues,
  squat: squatCues,
  hinge: hingeCues,
  core: coreCues,
  hold: holdCues,
  mobility: mobilityCues,
}
