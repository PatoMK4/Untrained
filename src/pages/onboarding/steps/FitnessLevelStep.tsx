import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { StepProps, MovementLevel, MovementPattern } from '@/types/app.types'

const movements: {
  key: MovementPattern
  label: string
  example: string
  dataKey: keyof Pick<
    import('@/types/app.types').OnboardingData,
    'level_push' | 'level_pull' | 'level_squat' | 'level_hinge' | 'level_core'
  >
}[] = [
  { key: 'push', label: 'Push', example: 'Push-ups, pressing',       dataKey: 'level_push' },
  { key: 'pull', label: 'Pull', example: 'Pull-ups, rows',            dataKey: 'level_pull' },
  { key: 'squat', label: 'Squat', example: 'Squats, lunges',          dataKey: 'level_squat' },
  { key: 'hinge', label: 'Hinge', example: 'Hip hinges, deadlifts',   dataKey: 'level_hinge' },
  { key: 'core', label: 'Core', example: 'Planks, holds',             dataKey: 'level_core' },
]

const levels: { value: MovementLevel; label: string; sub: string }[] = [
  { value: 1, label: 'BEGINNER',     sub: 'Just starting' },
  { value: 2, label: 'NOVICE',       sub: 'Building form' },
  { value: 3, label: 'INTERMEDIATE', sub: 'Progressing' },
  { value: 4, label: 'ADVANCED',     sub: 'Mastered' },
]

type LevelMap = Record<string, MovementLevel>

export function FitnessLevelStep({ onNext, onBack, data }: StepProps) {
  const [levelMap, setLevelMap] = useState<LevelMap>({
    level_push:  data.level_push  ?? 1,
    level_pull:  data.level_pull  ?? 1,
    level_squat: data.level_squat ?? 1,
    level_hinge: data.level_hinge ?? 1,
    level_core:  data.level_core  ?? 1,
  })

  const setLevel = (key: string, value: MovementLevel) => {
    setLevelMap((prev) => ({ ...prev, [key]: value }))
  }

  const handleContinue = () => {
    onNext({
      level_push:  levelMap.level_push  as MovementLevel,
      level_pull:  levelMap.level_pull  as MovementLevel,
      level_squat: levelMap.level_squat as MovementLevel,
      level_hinge: levelMap.level_hinge as MovementLevel,
      level_core:  levelMap.level_core  as MovementLevel,
    })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-text-primary leading-tight">
          One last thing.
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          Rate your experience for each movement. Be honest — this sets your starting point.
        </p>
      </div>

      <div className="flex flex-col gap-5 flex-1">
        {movements.map((movement) => {
          const currentLevel = levelMap[movement.dataKey] as MovementLevel

          return (
            <div key={movement.key}>
              {/* Movement label */}
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-text-primary font-bold text-sm tracking-wide">
                  {movement.label}
                </p>
                <p className="text-text-disabled text-xs">{movement.example}</p>
              </div>

              {/* Level buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {levels.map((level) => {
                  const isSelected = currentLevel === level.value
                  return (
                    <button
                      key={level.value}
                      onClick={() => setLevel(movement.dataKey, level.value)}
                      className={cn(
                        'flex flex-col items-center py-2.5 px-1 rounded-card border-2 transition-all active:scale-95',
                        isSelected
                          ? 'border-accent bg-surface text-accent'
                          : 'border-text-disabled bg-surface text-text-disabled'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-bold tracking-wide leading-tight text-center',
                        isSelected ? 'text-accent' : 'text-text-disabled'
                      )}>
                        {level.label}
                      </span>
                      <span className="text-xs mt-0.5 text-center leading-tight opacity-70">
                        {level.sub}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-text-disabled text-xs text-center mt-4 mb-2">
        You can be a different level for each movement — that's normal.
      </p>

      <div className="flex gap-3 mt-2">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="w-24">
            ← BACK
          </Button>
        )}
        <Button fullWidth onClick={handleContinue}>
          CONTINUE →
        </Button>
      </div>
    </div>
  )
}