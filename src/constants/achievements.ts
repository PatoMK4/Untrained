import type { AchievementDef } from '@/types/app.types'

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_rep', label: 'First Rep', description: 'Logged your first workout', icon: '💪' },
  { key: 'warm_body', label: 'Warm Body', description: 'Completed 5 warm-ups without skipping', icon: '🔥' },
  { key: 'the_streak', label: 'The Streak', description: '7 consecutive training days', icon: '⚡' },
  { key: 'iron_consistency', label: 'Iron Consistency', description: '4 full weeks of training', icon: '🏆' },
  { key: 'first_pullup', label: 'First Pull-Up', description: 'Logged your first pull-up rep', icon: '🎯' },
  { key: 'level_up', label: 'Level Up', description: 'Hit your first exercise progression', icon: '📈' },
  { key: 'ahead_of_curve', label: 'Ahead of the Curve', description: 'Hit a prediction 2+ weeks early', icon: '🚀' },
  { key: 'untrained_no_more', label: 'Untrained No More', description: 'Completed 30 days in the app', icon: '🥇' },
]
