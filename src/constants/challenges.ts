export interface Challenge {
  key: string
  title: string
  description: string
  icon: string
  category: 'strength' | 'endurance' | 'consistency' | 'special'
  requirement: {
    type: 'total_reps' | 'total_sessions' | 'streak' | 'single_set_reps' | 'total_sets'
    value: number
    exercise?: string // optional: specific exercise name
  }
  xpReward: number
}

export const CHALLENGES: Challenge[] = [
  // Consistency
  {
    key: 'first_session',
    title: 'FIRST BLOOD',
    description: 'Complete your first session.',
    icon: '🏁',
    category: 'consistency',
    requirement: { type: 'total_sessions', value: 1 },
    xpReward: 25,
  },
  {
    key: 'week_warrior',
    title: 'WEEK WARRIOR',
    description: 'Train 7 days in a row.',
    icon: '🔥',
    category: 'consistency',
    requirement: { type: 'streak', value: 7 },
    xpReward: 75,
  },
  {
    key: 'two_week_streak',
    title: '14 DAYS ON TRACK',
    description: 'Maintain a 14-day training streak.',
    icon: '⚡',
    category: 'consistency',
    requirement: { type: 'streak', value: 14 },
    xpReward: 150,
  },
  {
    key: 'thirty_sessions',
    title: 'THE GRIND',
    description: 'Complete 30 total sessions.',
    icon: '💀',
    category: 'consistency',
    requirement: { type: 'total_sessions', value: 30 },
    xpReward: 200,
  },
  // Strength
  {
    key: 'hundred_reps',
    title: 'THE 100 CLUB',
    description: 'Log 100 total reps in a single session.',
    icon: '💯',
    category: 'strength',
    requirement: { type: 'total_reps', value: 100 },
    xpReward: 50,
  },
  {
    key: 'thousand_reps',
    title: 'REP MACHINE',
    description: 'Log 1,000 total reps across all sessions.',
    icon: '🦾',
    category: 'strength',
    requirement: { type: 'total_reps', value: 1000 },
    xpReward: 100,
  },
  {
    key: 'ten_thousand_reps',
    title: 'IRON WILL',
    description: 'Log 10,000 total reps across all sessions.',
    icon: '🏋️',
    category: 'strength',
    requirement: { type: 'total_reps', value: 10000 },
    xpReward: 500,
  },
  {
    key: 'pushup_20',
    title: 'PUSH THE LIMIT',
    description: 'Log 20 push-ups in a single set.',
    icon: '💪',
    category: 'strength',
    requirement: { type: 'single_set_reps', value: 20, exercise: 'push-up' },
    xpReward: 75,
  },
  // Endurance
  {
    key: 'fifty_sessions',
    title: 'HALF CENTURY',
    description: 'Complete 50 total sessions.',
    icon: '🎯',
    category: 'endurance',
    requirement: { type: 'total_sessions', value: 50 },
    xpReward: 300,
  },
  {
    key: 'five_hundred_sets',
    title: 'SET MACHINE',
    description: 'Complete 500 total sets across all sessions.',
    icon: '🔩',
    category: 'endurance',
    requirement: { type: 'total_sets', value: 500 },
    xpReward: 200,
  },
  // Special
  {
    key: 'savage_summer',
    title: 'SAVAGE SUMMER',
    description: 'Complete 30 sessions between June and August.',
    icon: '☀️',
    category: 'special',
    requirement: { type: 'total_sessions', value: 30 },
    xpReward: 500,
  },
]

export function evaluateChallenges(stats: {
  totalSessions: number
  totalReps: number
  totalSets: number
  currentStreak: number
}): Record<string, 'completed' | 'in_progress' | 'locked'> {
  const result: Record<string, 'completed' | 'in_progress' | 'locked'> = {}

  for (const challenge of CHALLENGES) {
    const { type, value } = challenge.requirement
    let current = 0

    if (type === 'total_sessions') current = stats.totalSessions
    else if (type === 'total_reps') current = stats.totalReps
    else if (type === 'total_sets') current = stats.totalSets
    else if (type === 'streak') current = stats.currentStreak
    else current = 0

    if (current >= value) result[challenge.key] = 'completed'
    else if (current > 0 && current >= value * 0.3) result[challenge.key] = 'in_progress'
    else result[challenge.key] = 'locked'
  }

  return result
}