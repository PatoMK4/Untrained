import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ProgressDots } from '@/components/ui/ProgressDots'
import { useOnboarding } from '@/hooks/useOnboarding'
import type { OnboardingData } from '@/types/app.types'
import { GoalStep } from './steps/GoalStep'
import { FrequencyStep } from './steps/FrequencyStep'
import { EnvironmentStep } from './steps/EnvironmentStep'
import { EquipmentStep } from './steps/EquipmentStep'
import { SplitPreferenceStep } from './steps/SplitPreferenceStep'
import { LimitationsStep } from './steps/LimitationsStep'
import { BenchmarkIntro } from './steps/BenchmarkIntro'
import { PushupBenchmark } from './steps/PushupBenchmark'
import { PullupBenchmark } from './steps/PullupBenchmark'
import { SquatBenchmark } from './steps/SquatBenchmark'
import { FitnessLevelStep } from './steps/FitnessLevelStep'
import { OnboardingComplete } from './steps/OnboardingComplete'

// 12 steps total (was 10)
// BenchmarkIntro (index 6) has no progress dot — it's a full-screen splash
const STEPS = [
  GoalStep,            // 0  — dot 0
  FrequencyStep,       // 1  — dot 1
  EnvironmentStep,     // 2  — dot 2
  EquipmentStep,       // 3  — dot 3
  SplitPreferenceStep, // 4  — dot 4  ← NEW
  LimitationsStep,     // 5  — dot 5
  BenchmarkIntro,      // 6  — NO dot (splash screen)
  PushupBenchmark,     // 7  — dot 6
  PullupBenchmark,     // 8  — dot 7
  SquatBenchmark,      // 9  — dot 8
  FitnessLevelStep,    // 10 — dot 9  ← NEW
  OnboardingComplete,  // 11 — dot 10
]

// Total progress dots shown = 11 (BenchmarkIntro excluded)
const PROGRESS_STEPS = 11

// BenchmarkIntro is at index 6 — hide dots on that step
const BENCHMARK_INTRO_INDEX = 6

export function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [data, setData] = useState<OnboardingData>({})
  const { submitOnboarding, loading } = useOnboarding()
  const navigate = useNavigate()

  const handleNext = async (newData: Partial<OnboardingData>) => {
    const updated = { ...data, ...newData }
    setData(updated)
    if (step === STEPS.length - 1) {
      await submitOnboarding(updated)
      navigate('/', { replace: true })
    } else {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (step === 0) return
    setDirection(-1)
    setStep((s) => s - 1)
  }

  const StepComponent = STEPS[step]
  const isBenchmarkIntro = step === BENCHMARK_INTRO_INDEX
  const showDots = !isBenchmarkIntro
  const showBack = step > 0 && !isBenchmarkIntro

  // Dot index: BenchmarkIntro has no dot, so steps after it are offset by -1
  const dotIndex = step > BENCHMARK_INTRO_INDEX ? step - 1 : step

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col flex-1 px-5 py-8 min-h-screen">

        {/* Header — back button + progress dots */}
        <div className="flex items-center justify-between mb-8 min-h-[24px]">
          {showBack ? (
            <button
              onClick={handleBack}
              className="text-text-secondary text-sm font-bold tracking-wide"
            >
              ← BACK
            </button>
          ) : (
            <div />
          )}
          {showDots ? (
            <ProgressDots total={PROGRESS_STEPS} current={dotIndex} />
          ) : (
            <div />
          )}
        </div>

        {/* Step content — animated slide */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            <StepComponent onNext={handleNext} onBack={handleBack} data={data} />
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}