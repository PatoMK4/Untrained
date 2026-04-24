// ── Core Enums ──────────────────────────────────────────────────────────────
export type Goal = 'strength' | 'muscle' | 'endurance' | 'weight_loss' | 'overall'
export type Environment = 'home' | 'gym' | 'both' | 'outdoors'
export type Equipment = 'none' | 'pullup_bar' | 'rings' | 'gym'
export type Effort = 'easy' | 'medium' | 'hard'
export type SessionType = 'push' | 'pull' | 'legs' | 'full_body' | 'active_recovery' | 'rest'
export type SessionStatus = 'generated' | 'in_progress' | 'completed' | 'skipped'
export type MuscleGroup = 'push' | 'pull' | 'squat' | 'core' | 'hinge' | 'mobility' | 'full_body'
export type MovementPattern = 'push' | 'pull' | 'squat' | 'core' | 'hinge'
export type AIMode = 'smart' | 'lite'
export type BodyFocus = 'lose' | 'maintain' | 'build'
export type WeightUnit = 'kg' | 'lbs'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

// Split preference — user selects during onboarding
export type SplitPreference = 'full_body' | 'ppl' | 'upper_lower' | 'bro_split'

// Per-movement fitness level — 1=beginner, 2=novice, 3=intermediate, 4=advanced
export type MovementLevel = 1 | 2 | 3 | 4

// Time slot for session selection
export type TimeSlot = 30 | 45 | 60 | 'no_rush'

// ── User ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  user_id: string
  goal: Goal
  training_days: number
  environment: Environment
  equipment: Equipment[]
  limitations: string | null
  pushup_benchmark: number
  pushup_effort: Effort
  pullup_benchmark: number
  pullup_effort: Effort
  squat_benchmark: number
  squat_type: 'hold' | 'jumps'
  squat_effort: Effort
  split_preference: SplitPreference
  level_push: MovementLevel
  level_pull: MovementLevel
  level_squat: MovementLevel
  level_hinge: MovementLevel
  level_core: MovementLevel
  onboarding_complete: boolean
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  weight_unit: WeightUnit
  ai_mode: AIMode
  body_tracking_enabled: boolean
  body_focus: BodyFocus
  body_tracking_prompt_count: number
}

export interface UserScore {
  id: string
  user_id: string
  total_score: number
  weekly_score: number
  week_start: string
  current_streak: number
  longest_streak: number
  total_sessions: number
  total_reps: number
}

// ── Exercise ────────────────────────────────────────────────────────────────
export interface Exercise {
  id: string
  name: string
  muscle_group: MuscleGroup
  progression_level: number
  equipment_required: Equipment
  cue_card: string[]
  is_warmup: boolean
  is_cooldown: boolean
  applicable_for: string[]
  contraindicated_with: string[]
  target_reps_min: number | null
  target_reps_max: number | null
  target_duration_seconds: number | null
}

// ── Session ─────────────────────────────────────────────────────────────────
export interface WorkoutSession {
  id: string
  user_id: string
  date: string
  time_available: 30 | 45 | 60
  session_type: SessionType
  status: SessionStatus
  exercises_completed: string[]
  total_sets: number
  total_reps: number
  overall_effort: string | null
  pain_note: string | null
  pain_flagged: boolean
  score_awarded: number
  created_at: string
  completed_at: string | null
}

export interface ExerciseLog {
  id: string
  session_id: string
  user_id: string
  exercise_id: string
  set_number: number
  reps: number | null
  duration_seconds: number | null
  effort: Effort
  extra_weight_kg: number | null
  logged_via: 'chat' | 'tap'
  skipped: boolean
  skip_reason: string | null
  created_at: string
}

// ── Progression ─────────────────────────────────────────────────────────────
export interface UserProgression {
  id: string
  user_id: string
  movement_pattern: MovementPattern
  current_level: number
  current_exercise_id: string | null
  sessions_at_level: number
  consecutive_easy: number
  consecutive_hard: number
  last_updated: string
}

// ── Chat ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  mode_used: AIMode
  parsed_log: ParsedLog | null
  created_at: string
}

export interface ParsedLog {
  type: 'reps' | 'effort' | 'weight' | 'skip' | 'rest' | 'done' | 'unknown'
  reps?: number
  effort?: Effort
  weightKg?: number
}

// ── Body & Nutrition ────────────────────────────────────────────────────────
export interface BodyLog {
  id: string
  user_id: string
  weight: number
  unit: WeightUnit
  note: string | null
  logged_at: string
}

export interface MealLog {
  id: string
  user_id: string
  meal_type: MealType
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  logged_at: string
}

export interface NutritionSettings {
  calorie_target: number
  macro_preset: 'performance' | 'balanced' | 'low_carb'
  meals_per_day: number
  tracking_enabled: boolean
  nutrition_prompted: boolean
}

// ── Onboarding ───────────────────────────────────────────────────────────────
export interface OnboardingData {
  goal?: Goal
  training_days?: number
  environment?: Environment
  equipment?: Equipment[]
  limitations?: string | null
  pushup_benchmark?: number
  pushup_effort?: Effort
  pullup_benchmark?: number
  pullup_effort?: Effort
  squat_benchmark?: number
  squat_type?: 'hold' | 'jumps'
  squat_effort?: Effort
  split_preference?: SplitPreference
  level_push?: MovementLevel
  level_pull?: MovementLevel
  level_squat?: MovementLevel
  level_hinge?: MovementLevel
  level_core?: MovementLevel
}

export interface StepProps {
  onNext: (data: Partial<OnboardingData>) => void
  onBack?: () => void
  data: OnboardingData
}

// ── Achievements ─────────────────────────────────────────────────────────────
export interface AchievementDef {
  key: string
  label: string
  description: string
  icon: string
}

export interface UnlockedAchievement {
  achievement_key: string
  unlocked_at: string
}
